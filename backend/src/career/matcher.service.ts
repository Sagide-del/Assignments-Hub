import suppliedCombinations from "./data/owner-supplied-combinations-20261113.json";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import {
  checkedCatalog,
  normalized,
  preparation,
  pathwayKey,
  relatedTrackNames,
} from "./matcher.engine";
import {
  ImportCombinationsDto,
  JuniorScoreDto,
  KjseaResultEntryDto,
  SaveKjseaResultsDto,
  kjseaLevels,
  MatchCombinationsDto,
  SaveCombinationDto,
} from "./matcher.dto";
@Injectable()
export class MatcherService {
  constructor(private readonly prisma: PrismaService) {}
  async assertStudent(actor: AuthenticatedUser) {
    const student = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: { id: true, schoolId: true, grade: true },
    });
    if (
      actor.role !== "STUDENT" ||
      !student ||
      student.schoolId !== actor.schoolId ||
      !/^(?:grade\s*)?9$/i.test(student.grade?.trim() ?? "")
    )
      throw new ForbiddenException(
        "The Grade 10 selection guide is for your own Grade 9 profile.",
      );
    return student;
  }
  async capabilities() {
    await this.prisma.grade10CombinationChoice.count();
    await this.prisma.student_KJSEA_Result.count();
    return {
      ready: true,
      version: 3,
      catalogue_revision: "owner-portal-copy-20261113",
      provided_combinations: await this.prisma.moE_Combination.count({
        where: { code: { in: suppliedCombinations.map((c) => c.code) } },
      }),
      results_storage: true,
      verified_combinations: await this.prisma.moE_Combination.count({
        where: { is_verified: true },
      }),
    };
  }
  cleanResults(value: unknown): KjseaResultEntryDto[] {
    const raw = Array.isArray(value)
      ? value
      : value && typeof value === "object"
        ? Object.entries(value).map(([subject, v]) =>
            typeof v === "number"
              ? { subject, percentage: v }
              : { subject, performance_level: v },
          )
        : [];
    return raw.flatMap((r: any) => {
      if (
        typeof r?.subject !== "string" ||
        r.subject.trim().length < 2 ||
        r.subject.length > 100
      )
        return [];
      const percentage =
        typeof r.percentage === "number" &&
        Number.isFinite(r.percentage) &&
        r.percentage >= 0 &&
        r.percentage <= 100
          ? r.percentage
          : undefined;
      const performance_level = kjseaLevels.includes(r.performance_level)
        ? r.performance_level
        : undefined;
      if ((percentage !== undefined) === (performance_level !== undefined))
        return [];
      return [
        {
          subject: r.subject.trim(),
          ...(percentage !== undefined
            ? { percentage }
            : { performance_level }),
        },
      ];
    });
  }
  async results(actor: AuthenticatedUser) {
    const student = await this.assertStudent(actor);
    const record = await this.prisma.student_KJSEA_Result.findUnique({
      where: {
        student_id_school_id: {
          student_id: student.id,
          school_id: student.schoolId,
        },
      },
    });
    return {
      results: this.cleanResults(record?.scores_json),
      source: record?.source ?? null,
      updated_at: record?.updated_at ?? null,
    };
  }
  async saveResults(actor: AuthenticatedUser, dto: SaveKjseaResultsDto) {
    const student = await this.assertStudent(actor),
      results = this.cleanResults(dto.results);
    if (
      results.length !== dto.results.length ||
      new Set(results.map((r) => normalized(r.subject))).size !== results.length
    )
      throw new BadRequestException(
        "Enter each subject once, with either a percentage or a reported performance level.",
      );
    const data = {
      school_id: student.schoolId,
      scores_json: results as any,
      source: "SELF_REPORTED",
    };
    const record = await this.prisma.student_KJSEA_Result.upsert({
      where: { student_id: student.id },
      create: { student_id: student.id, ...data },
      update: data,
    });
    return { results, source: record.source, updated_at: record.updated_at };
  }
  async catalog() {
    return this.prisma.moE_Combination.findMany({
      where: { is_verified: true },
      orderBy: { code: "asc" },
    });
  }
  async archive(id: string) {
    const result = await this.prisma.moE_Combination.updateMany({
      where: { id },
      data: { is_verified: false },
    });
    if (!result.count) throw new NotFoundException("Combination not found.");
    return { unpublished: true };
  }
  async importCatalog(dto: ImportCombinationsDto) {
    const rows = checkedCatalog(dto);
    if (dto.dry_run === false && dto.reviewed !== true)
      throw new BadRequestException(
        "Review the official source before publishing its catalogue.",
      );
    if (dto.dry_run !== false)
      return {
        dry_run: true,
        records: rows.length,
        codes: rows.map((r) => r.code),
      };
    await this.prisma.$transaction(
      rows.map((row) =>
        this.prisma.moE_Combination.upsert({
          where: { code: row.code },
          create: row,
          update: row,
        }),
      ),
    );
    return { dry_run: false, imported: rows.length };
  }
  async recommend(actor: AuthenticatedUser, dto: MatchCombinationsDto) {
    const student = await this.assertStudent(actor);
    const [catalog, tracks, report, choice, savedResult] = await Promise.all([
      this.catalog(),
      this.prisma.track.findMany({
        where: { isPublished: true },
        include: { pathway: true },
      }),
      this.prisma.learningCoachReportCard.findFirst({
        where: {
          studentId: student.id,
          schoolId: student.schoolId,
          status: "ANALYZED",
        },
        orderBy: { createdAt: "desc" },
        select: { extractedScores: true },
      }),
      this.prisma.grade10CombinationChoice.findUnique({
        where: { student_id: student.id },
        include: { combination: true, track: { include: { pathway: true } } },
      }),
      this.prisma.student_KJSEA_Result.findUnique({
        where: {
          student_id_school_id: {
            student_id: student.id,
            school_id: student.schoolId,
          },
        },
      }),
    ]);
    const extracted = Array.isArray(report?.extractedScores)
      ? report!.extractedScores
      : [];
    const existing = extracted.flatMap((r: any) =>
      typeof r?.subject === "string" &&
      typeof r?.percentage === "number" &&
      Number.isFinite(r.percentage) &&
      r.percentage >= 0 &&
      r.percentage <= 100
        ? [{ subject: r.subject, percentage: r.percentage }]
        : [],
    );
    const stored = this.cleanResults(savedResult?.scores_json);
    const savedNames = new Set(stored.map((r) => normalized(r.subject)));
    const scores: KjseaResultEntryDto[] = dto.scores ?? [
      ...stored,
      ...existing.filter((r) => !savedNames.has(normalized(r.subject))),
    ];
    if (
      new Set(scores.map((s) => normalized(s.subject))).size !== scores.length
    )
      throw new BadRequestException("Enter each subject once.");
    const target = dto.target_score ?? 60,
      interests = (dto.interests ?? []).map(normalized).filter(Boolean),
      career = normalized(dto.desired_career ?? "");
    const careerTitles = (track: any): string[] =>
      Array.isArray(track?.careers)
        ? track.careers.flatMap((c: any) =>
            typeof c?.title === "string" ? [c.title] : [],
          )
        : [];
    const rank = (
      item: { subjects: string[]; track: string; pathway: string },
      titles: string[],
    ) => {
      const text = normalized(
        [...item.subjects, item.track, item.pathway, ...titles].join(" "),
      );
      return (
        interests.filter((i) => text.includes(i)).length * 100 +
        (career && titles.some((c) => normalized(c).includes(career)) ? 100 : 0)
      );
    };
    const matches = catalog
      .map((item) => {
        const related = tracks.filter(
          (t) =>
            pathwayKey(t.pathway.name) === pathwayKey(item.pathway) &&
            relatedTrackNames(item.track).includes(normalized(t.name)),
        );
        const allCareers = [...new Set(related.flatMap(careerTitles))];
        const careers = allCareers
            .sort(
              (a, b) =>
                Number(!!career && normalized(b).includes(career)) -
                Number(!!career && normalized(a).includes(career)),
            )
            .slice(0, 3),
          prep = preparation(item.subjects, scores, target);
        const context = normalized(
            [...item.subjects, item.track, item.pathway, ...careers].join(" "),
          ),
          hits = (dto.interests ?? []).filter(
            (i) => normalized(i) && context.includes(normalized(i)),
          );
        const reason = hits.length
          ? `Connects with your stated interests: ${hits.join(", ")}.`
          : "Explore this reviewed subject set against your interests and school advice.";
        return {
          ...item,
          careers,
          preparation: prep,
          interest_matches: rank(item, careers),
          why_it_matches:
            reason +
            (prep.average === null
              ? " Add junior results to see preparation indicators."
              : ` Available junior preparation indicators average ${prep.average}%.`),
        };
      })
      .sort(
        (a, b) =>
          b.interest_matches - a.interest_matches ||
          (b.preparation.average ?? -1) - (a.preparation.average ?? -1) ||
          a.code.localeCompare(b.code),
      );
    const pathways = tracks
      .map((t) => ({
        id: t.id,
        name: t.name,
        pathway: t.pathway.name,
        description: t.description,
        careers: careerTitles(t).slice(0, 3),
        preparation: preparation(
          Array.isArray(t.requiredSubjects)
            ? t.requiredSubjects.flatMap((r: any) =>
                typeof r?.subject === "string" ? [r.subject] : [],
              )
            : [],
          scores,
          target,
        ),
        interest_matches: rank(
          { subjects: [], track: t.name, pathway: t.pathway.name },
          careerTitles(t),
        ),
      }))
      .sort(
        (a, b) =>
          b.interest_matches - a.interest_matches ||
          (b.preparation.average ?? -1) - (a.preparation.average ?? -1) ||
          a.name.localeCompare(b.name),
      );
    return {
      catalog_count: catalog.length,
      matches: matches.slice(0, 3),
      catalog: matches,
      pathways,
      scores,
      score_source: dto.scores
        ? "manual"
        : stored.length
          ? "saved_kjsea"
          : existing.length
            ? "confirmed_report"
            : "none",
      target_score: target,
      choice,
      advisory:
        "Preparation uses junior subject indicators and your personal target. No universal pass mark, official eligibility or school availability is inferred.",
    };
  }
  async save(actor: AuthenticatedUser, dto: SaveCombinationDto) {
    const student = await this.assertStudent(actor);
    if (Boolean(dto.combination_id) === Boolean(dto.track_id))
      throw new BadRequestException(
        "Select exactly one combination or exploration track.",
      );
    if (
      dto.combination_id &&
      !(await this.prisma.moE_Combination.findFirst({
        where: { id: dto.combination_id, is_verified: true },
      }))
    )
      throw new NotFoundException("Source-reviewed combination not found.");
    if (
      dto.track_id &&
      !(await this.prisma.track.findFirst({
        where: { id: dto.track_id, isPublished: true },
      }))
    )
      throw new NotFoundException("Published exploration track not found.");
    const data = {
      school_id: student.schoolId,
      combination_id: dto.combination_id ?? null,
      track_id: dto.track_id ?? null,
    };
    // A planning shortlist never changes enrolled electives, grade or placement.
    return this.prisma.grade10CombinationChoice.upsert({
      where: { student_id: student.id },
      create: { student_id: student.id, ...data },
      update: data,
      include: { combination: true, track: true },
    });
  }
}
