import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CmsService } from "../cms/cms.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { Role } from "../common/enums/role.enum";
import { FocusSubject, SchoolBlock } from "./timetable.types";
import { validateSchoolBlocks } from "./timetable-engine";
export const normalize = (s: string) => {
  const n = s.trim().toLowerCase().replace(/\s+/g, " ");
  return ["math", "maths"].includes(n) ? "mathematics" : n;
};
const percent = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100;
export function moduleQuestions(body: any) {
  if (!body || !Array.isArray(body.questions)) return [];
  return body.questions
    .map((q: any, index: number) => ({ q, index }))
    .filter(
      ({ q }: any) =>
        q &&
        typeof q.question_text === "string" &&
        q.question_text.length <= 5000 &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        q.options.every(
          (x: unknown) => typeof x === "string" && x.length <= 1500,
        ) &&
        new Set(q.options).size === 4 &&
        q.options.includes(q.correct_answer) &&
        typeof q.explanation === "string" &&
        !/\b(?:passage|dialogue|extract|table|diagram)\s+(?:above|below)\b/i.test(
          q.question_text,
        ),
    );
}
@Injectable()
export class TimetableContextService {
  constructor(
    private readonly db: PrismaService,
    private readonly cms: CmsService,
  ) {}
  async student(actor: AuthenticatedUser) {
    const user = await this.db.user.findFirst({
      where: {
        id: actor.id,
        schoolId: actor.schoolId,
        role: "STUDENT",
        isActive: true,
      },
      include: {
        school: true,
        studentProfile: true,
        pathwaySelections: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { track: { include: { pathway: true } } },
        },
      },
    });
    if (
      actor.role !== Role.STUDENT ||
      !user ||
      !/^Grade (6|7|8|9|10|11|12)$/.test(user.grade ?? "")
    )
      throw new ForbiddenException(
        "Weekly study plans are available to learners in Grades 6–12.",
      );
    return user;
  }
  async modules(actor: AuthenticatedUser) {
    try {
      const allowed = await this.cms.getLearningModules(actor);
      return this.db.masterModule.findMany({
        where: { id: { in: allowed.map((m) => m.id) } },
      });
    } catch (e) {
      if (e instanceof ForbiddenException) return [];
      throw e;
    }
  }
  async load(actor: AuthenticatedUser) {
    const user = await this.student(actor),
      grade = Number(user.grade!.replace("Grade ", ""));
    const pathway =
      user.pathwaySelections[0]?.track.pathway.name ??
      user.studentProfile?.pathway ??
      null;
    const track = user.pathwaySelections[0]?.track.name ?? null;
    const [
      marks,
      submissions,
      mocks,
      external,
      coach,
      taxonomy,
      modules,
      schedules,
      reportFiles,
    ] = await Promise.all([
      this.db.studentAcademicResult.findMany({
        where: {
          schoolId: actor.schoolId,
          studentId: actor.id,
          batch: { status: "COMPLETED", grade: user.grade! },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      this.db.submission.findMany({
        where: {
          studentId: actor.id,
          status: { in: ["GRADED", "RETURNED"] },
          resultsReleasedAt: { not: null },
          score: { not: null },
          assignment: { schoolId: actor.schoolId, grade: user.grade! },
        },
        select: {
          score: true,
          assignment: { select: { subject: true, maxPoints: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      this.db.kjseaMockAttempt.findMany({
        where: {
          studentId: actor.id,
          schoolId: actor.schoolId,
          status: "SUBMITTED",
          completedAt: { not: null },
          score: { not: null },
          source: { not: "PRACTICE" },
          NOT: { questions: { array_contains: [{ manualSelfReview: true }] } },
        },
        select: { subject: true, score: true, coverage: true },
        orderBy: { completedAt: "desc" },
        take: 50,
      }),
      this.db.externalMock_Record.findMany({
        where: {
          student_id: actor.id,
          school_id: actor.schoolId,
          grade_level: grade,
        },
        orderBy: [{ academic_year: "desc" }, { imported_at: "desc" }],
        take: 50,
      }),
      this.db.learningCoachPlan.findMany({
        where: {
          studentId: actor.id,
          schoolId: actor.schoolId,
          grade: user.grade!,
          OR: [
            { lastDiagnosticScore: { not: null } },
            { sessions: { some: { completedAt: { not: null } } } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 100,
      }),
      this.db.curriculumTaxonomy.findMany({
        where: { grade },
        orderBy: { subject: "asc" },
      }),
      this.modules({ ...actor, grade: user.grade }),
      this.db.study_School_Schedule.findMany({
        where: {
          school_id: actor.schoolId,
          grade: { in: ["ALL", user.grade!] },
          stream: { in: ["", user.studentProfile?.stream ?? ""] },
        },
      }),
      this.db.learningCoachReportCard.count({
        where: { schoolId: actor.schoolId, studentId: actor.id },
      }),
    ]);
    const warnings: string[] = [];
    if (reportFiles && !marks.length)
      warnings.push(
        "Report-card files are saved, but their marks have not been imported. Uploaded files are not automatically interpreted.",
      );
    if (!schedules.length)
      warnings.push(
        "No school timetable is connected; the default after-school and weekend windows are used.",
      );
    const core = new Set([
      "english",
      "kiswahili",
      "mathematics",
      "core mathematics",
      "essential mathematics",
      "physical education",
      "community service learning",
    ]);
    const allowedTaxonomy = taxonomy.filter(
      (t) =>
        grade < 10 ||
        !t.pathway ||
        core.has(normalize(t.subject)) ||
        (pathway &&
          normalize(t.pathway) === normalize(pathway) &&
          (!track || !t.track || normalize(t.track) === normalize(track))),
    );
    const names = new Map<string, string>();
    for (const t of allowedTaxonomy)
      names.set(normalize(t.subject), t.subject.trim());
    if (!names.size) {
      for (const r of [
        ...marks,
        ...coach,
        ...submissions.map((s) => s.assignment),
      ])
        names.set(normalize(r.subject), r.subject.trim());
      warnings.push(
        "Curriculum coverage is incomplete; the plan uses subjects present in your measured results.",
      );
    }
    if (grade >= 10 && !pathway)
      warnings.push("Set your pathway to improve elective subject coverage.");
    const source = new Map<string, Map<string, number[]>>();
    function add(subject: string, type: string, value: number) {
      if (!percent(value) || !names.has(normalize(subject))) return;
      const key = normalize(subject),
        entry = source.get(key) ?? new Map<string, number[]>();
      const values = entry.get(type) ?? [];
      if (values.length < 5) values.push(value);
      entry.set(type, values);
      source.set(key, entry);
    }
    const seenMarks = new Set<string>();
    for (const r of marks) {
      const key = normalize(r.subject);
      if (!seenMarks.has(key)) {
        add(r.subject, "Report card", r.percentage);
        seenMarks.add(key);
      }
    }
    for (const r of submissions)
      if (r.assignment.maxPoints > 0 && r.score !== null)
        add(
          r.assignment.subject,
          "Released assignments",
          (r.score / r.assignment.maxPoints) * 100,
        );
    for (const r of mocks) {
      const c = r.coverage as any;
      if (
        c?.grade === user.grade &&
        c?.assessment === "TIMED_MOCK" &&
        c?.contentKind !== "STARTER" &&
        typeof c?.totalMarks === "number" &&
        c.totalMarks > 0 &&
        r.score !== null
      )
        add(r.subject, "Timed mocks", (r.score / c.totalMarks) * 100);
    }
    for (const r of external) add(r.subject, "External mocks", r.score);
    for (const r of coach)
      add(r.subject, "Learning Coach", r.lastDiagnosticScore ?? r.masteryScore);
    const weight: Record<string, number> = {
      "Report card": 4,
      "Released assignments": 3,
      "Timed mocks": 3,
      "External mocks": 3,
      "Learning Coach": 2,
    };
    const subjects: FocusSubject[] = [...names]
      .map(([key, subject]) => {
        const inputs = source.get(key) ?? new Map<string, number[]>();
        let total = 0,
          weights = 0;
        for (const [name, values] of inputs) {
          if (!values.length) continue;
          const w = weight[name];
          total += (values.reduce((a, b) => a + b, 0) / values.length) * w;
          weights += w;
        }
        const percentage = weights
            ? Math.round((total / weights) * 100) / 100
            : null,
          weak =
            (percentage !== null && percentage < 60) ||
            coach.some(
              (c) =>
                normalize(c.subject) === key &&
                (c.lastDiagnosticScore ?? c.masteryScore) < 60,
            );
        const relevantCoach = coach
          .filter((c) => normalize(c.subject) === key)
          .sort((a, b) => a.masteryScore - b.masteryScore);
        const moduleTopics = modules.filter(
          (m) =>
            normalize(m.subject) === key &&
            moduleQuestions(m.content_json).length >= 3,
        );
        const curriculum = allowedTaxonomy
          .filter((t) => normalize(t.subject) === key)
          .flatMap((t) => t.topics);
        const topics = [
          ...new Set(
            [
              ...relevantCoach.map((c) => c.topic),
              ...moduleTopics.map((m) => m.topic),
              ...curriculum,
            ]
              .map((s) => s.trim())
              .filter(Boolean),
          ),
        ].slice(0, 4);
        return {
          subject,
          percentage,
          weak,
          sources: [...inputs.keys()],
          topics: (topics.length ? topics : ["Core concepts"]).map((topic) => {
            const module = moduleTopics.find(
              (m) => normalize(m.topic) === normalize(topic),
            );
            return {
              subject,
              topic: topic.slice(0, 160),
              weak,
              percentage,
              ...(module ? { module_id: module.id } : {}),
            };
          }),
        };
      })
      .sort(
        (a, b) =>
          (a.percentage ?? 101) - (b.percentage ?? 101) ||
          a.subject.localeCompare(b.subject),
      );
    if (!subjects.some((s) => s.percentage !== null))
      warnings.push(
        "No measured results are available yet. This is a balanced starter plan, not a diagnosis of weak subjects.",
      );
    const school: SchoolBlock[] = schedules.flatMap((s) =>
      validateSchoolBlocks(s.blocks_json),
    );
    return { user, pathway, subjects, school, reportFiles, warnings };
  }
}
