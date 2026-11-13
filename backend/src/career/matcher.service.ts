import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { checkedCatalog, normalized, preparation } from "./matcher.engine";
import {
  ImportCombinationsDto,
  JuniorScoreDto,
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
    return {
      ready: true,
      version: 1,
      verified_combinations: await this.prisma.moE_Combination.count({
        where: { is_verified: true },
      }),
    };
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
    const [catalog, tracks, report, choice] = await Promise.all([
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
    const scores: JuniorScoreDto[] = dto.scores ?? existing;
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
        const track = tracks.find(
          (t) =>
            normalized(t.name) === normalized(item.track) &&
            normalized(t.pathway.name) === normalized(item.pathway),
        );
        const careers = careerTitles(track).slice(0, 3),
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
