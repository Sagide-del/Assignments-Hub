import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { randomUUID } from "crypto";
import manifest from "./github-curriculum.manifest.json";
import {
  parseRepositoryDesign,
  curriculumText,
  RepositoryDesign,
} from "./github-curriculum-parser";
import { compact } from "./collection-tools";
export const repositorySnapshotRoot = () =>
  resolve(process.cwd(), "dist/curriculum-data");
@Injectable()
export class GitHubCurriculumService {
  constructor(private readonly prisma: PrismaService) {}
  private async report() {
    try {
      const snapshot = JSON.parse(
        await readFile(
          resolve(repositorySnapshotRoot(), "snapshot.json"),
          "utf8",
        ),
      );
      if (
        snapshot.commit !== manifest.commit ||
        snapshot.files.length !== manifest.files.length
      )
        throw Error("Snapshot mismatch");
      return snapshot;
    } catch {
      throw new ServiceUnavailableException(
        "The pinned curriculum snapshot is not ready. Wait for the backend deployment; no Google Drive download is required.",
      );
    }
  }
  async catalogue(grade?: string) {
    if (grade && !manifest.files.some((e) => e.grade === grade))
      throw new BadRequestException("Choose Grade 6–12.");
    const snapshot = await this.report();
    return {
      repository: manifest.repository,
      commit: manifest.commit,
      officialVerification: "THIRD_PARTY_TRANSCRIPTION_REQUIRES_REVIEW",
      files: manifest.files
        .filter((e) => !grade || e.grade === grade)
        .map((e) => ({
          ...e,
          extraction: snapshot.files.find((r: any) => r.id === e.id),
        })),
    };
  }
  async importDesigns(
    dto: {
      grades: string[];
      fileIds: string[];
      commit: string;
      rightsConfirmed: true;
    },
    actor: AuthenticatedUser,
  ) {
    await this.report();
    if (dto.commit !== manifest.commit)
      throw new BadRequestException(
        "The source snapshot changed. Refresh the curriculum list.",
      );
    const files = dto.fileIds.map((id) =>
      manifest.files.find((e) => e.id === id),
    );
    if (files.some((e) => !e || !dto.grades.includes(e.grade)))
      throw new BadRequestException(
        "Choose files belonging to the selected grades.",
      );
    const selected = files as RepositoryDesign[];
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('github-curriculum-import'))`;
        const existing = await tx.collectionAsset.findMany({
          where: { origin: { in: selected.map((e) => e.sourceUrl) } },
          select: { origin: true, collectionId: true },
        });
        const fresh = selected.filter(
          (e) => !existing.some((a) => a.origin === e.sourceUrl),
        );
        if (!fresh.length)
          return {
            queued: 0,
            skipped: selected.length,
            collectionId: existing[0]?.collectionId ?? null,
          };
        const collection = await tx.contentCollection.create({
          data: {
            name: `KICD transcription snapshot · ${dto.grades.join(", ")}`,
            grades: dto.grades,
            rightsConfirmed: dto.rightsConfirmed,
            createdById: actor.id,
          },
        });
        const assets = fresh.map((e) => ({
          id: randomUUID(),
          collectionId: collection.id,
          name: e.path.split("/").pop()!,
          origin: e.sourceUrl,
          role: "CURRICULUM",
        }));
        await tx.collectionAsset.createMany({ data: assets });
        await tx.contentLibraryJob.createMany({
          data: assets.map((a, i) => ({
            kind: "INGEST_GITHUB",
            createdById: actor.id,
            input: {
              assetId: a.id,
              sourceId: fresh[i].id,
              grade: fresh[i].grade,
              subject: fresh[i].subject,
              commit: manifest.commit,
            },
          })),
        });
        return {
          queued: assets.length,
          skipped: selected.length - fresh.length,
          collectionId: collection.id,
        };
      },
      { timeout: 30000 },
    );
  }
  async prepareGrade(
    dto: {
      grade: string;
      commit: string;
      rightsConfirmed: true;
      acceptSourceLimitations: true;
    },
    actor: AuthenticatedUser,
  ) {
    const files = manifest.files.filter((e) => e.grade === dto.grade);
    if (
      !files.length ||
      dto.commit !== manifest.commit ||
      !dto.acceptSourceLimitations ||
      !dto.rightsConfirmed
    )
      throw new BadRequestException(
        "Choose a supported grade and accept the available source limitations.",
      );
    await this.importDesigns(
      {
        grades: [dto.grade],
        commit: dto.commit,
        fileIds: files.map((f) => f.id),
        rightsConfirmed: true,
      },
      actor,
    );
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`prepare-grade:${dto.grade}`}))`;
        const active = await tx.contentLibraryJob.findFirst({
          where: {
            kind: "PREPARE_GRADE",
            status: { in: ["QUEUED", "RUNNING"] },
            AND: [
              { input: { path: ["grade"], equals: dto.grade } },
              { input: { path: ["commit"], equals: manifest.commit } },
            ],
          },
        });
        if (active) return { id: active.id, resumed: true, pausedDownloads: 0 };
        const assets = await tx.collectionAsset.findMany({
          where: {
            OR: [
              { origin: { in: files.map((f) => f.sourceUrl) } },
              {
                origin: { startsWith: "https://drive.google.com/" },
                collection: { grades: { array_contains: [dto.grade] } },
              },
            ],
          },
          select: { id: true, origin: true, status: true },
        });
        const id = randomUUID();
        let pausedDownloads = 0;
        for (const asset of assets) {
          const drive = asset.origin.startsWith("https://drive.google.com/");
          const changed = await tx.contentLibraryJob.updateMany({
            where: {
              kind: drive
                ? "INGEST_URL"
                : { in: ["INGEST_GITHUB", "INDEX_ASSET"] },
              status: "QUEUED",
              input: { path: ["assetId"], equals: asset.id },
            },
            data: {
              status: "PAUSED",
              error: drive
                ? "Paused while the pinned curriculum snapshot is prepared. Resume only if you need this alternative source."
                : "Handled by automatic grade preparation.",
            },
          });
          if (drive) pausedDownloads += changed.count;
          if (changed.count && asset.status === "QUEUED")
            await tx.collectionAsset.updateMany({
              where: { id: asset.id, status: "QUEUED" },
              data: {
                status: "PAUSED",
                error: "Paused during automatic grade preparation.",
              },
            });
        }
        await tx.contentLibraryJob.create({
          data: {
            id,
            kind: "PREPARE_GRADE",
            createdById: actor.id,
            input: {
              grade: dto.grade,
              commit: manifest.commit,
              acceptSourceLimitations: true,
            },
          },
        });
        return { id, resumed: false, pausedDownloads };
      },
      { timeout: 30000 },
    );
  }
  designsForGrade(grade: string) {
    return manifest.files.filter((e) => e.grade === grade);
  }
  async stage(asset: any, input: { sourceId: string; commit: string }) {
    const entry = manifest.files.find((e) => e.id === input.sourceId);
    if (
      !entry ||
      input.commit !== manifest.commit ||
      asset.origin !== entry.sourceUrl ||
      !(asset.collection.grades as string[]).includes(entry.grade)
    )
      throw Error("This job does not match the pinned source manifest.");
    const raw = await readFile(
      resolve(repositorySnapshotRoot(), entry.id + ".md"),
      "utf8",
    );
    const parsed = parseRepositoryDesign(raw, entry);
    const official = await this.prisma.questionBankSourceDocument.findMany({
      where: {
        grade: entry.grade,
        subject: entry.subject,
        role: "CURRICULUM",
        reviewed: true,
        fileName: { startsWith: "https://kicd.ac.ke/" },
      },
      include: { chunks: { select: { content: true } } },
    });
    const comparisons = official.map((s) => {
      const text = compact(
        curriculumText(s.chunks.map((c) => c.content).join(" ")),
      ).toLowerCase();
      return {
        sourceId: s.id,
        matchedQuotes: parsed.mapping.subjects[0].units.filter((u) =>
          text.includes(compact(u.quote).toLowerCase()),
        ).length,
      };
    });
    const source = {
      repository: manifest.repository,
      commit: manifest.commit,
      path: entry.path,
      sha256: entry.sha256,
      revision: entry.revision,
      sourceUrl: entry.sourceUrl,
      officialDirectory: entry.officialDirectory,
      coverage: parsed.coverage,
      comparisons,
      limitationsReviewed: false,
    };
    await this.prisma.collectionAsset.update({
      where: { id: asset.id },
      data: {
        role: "CURRICULUM",
        status: "REVIEW",
        extractedText: parsed.text,
        mapping: { ...parsed.mapping, _source: source } as any,
        error: parsed.coverage.warnings.length
          ? parsed.coverage.warnings.join(" ").slice(0, 2000)
          : null,
      },
    });
    return {
      sourceId: entry.id,
      rows: parsed.rows,
      outcomes: parsed.outcomes,
      sourceLimitations: parsed.coverage.warnings,
      comparisons,
    };
  }
}
