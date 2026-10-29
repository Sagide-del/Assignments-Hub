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
