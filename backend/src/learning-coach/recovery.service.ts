import { recallRecords } from "../study-hub/recall-history";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { Role } from "../common/enums/role.enum";
import { StudentScopeService } from "../student/student-scope.service";
import { allowedAssignmentSubject } from "../student/assignment-subjects";
import { subjectKey, key } from "../student/student-scope.policy";

export type LearningSignal = {
  subject: string;
  topic: string | null;
  score: number;
  at: string;
  source: string;
};
export function recoveryPriority(
  baseline: number | null,
  signals: LearningSignal[],
  now: Date,
  due: string | null,
) {
  const recent = signals
    .filter((s) => new Date(s.at).getTime() >= now.getTime() - 90 * 86400000)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5);
  const current = recent.length
    ? Math.round(
        recent.reduce((n, s, i) => n + s.score * (5 - i), 0) /
          recent.reduce((n, _, i) => n + 5 - i, 0),
      )
    : baseline;
  const reviewDue = !!due && new Date(due) <= now;
  return {
    current,
    reviewDue,
    priority:
      current === null ? 25 : Math.max(0, 80 - current) + (reviewDue ? 15 : 0),
    stage:
      current === null
        ? "DIAGNOSE"
        : current < 50
          ? "REBUILD"
          : current < 80
            ? "PRACTISE"
            : reviewDue
              ? "REVIEW"
              : "MAINTAIN",
  };
}
@Injectable()
export class RecoveryService {
  constructor(
    private readonly db: PrismaService,
    private readonly scopes: StudentScopeService,
  ) {}
  async load(actor: AuthenticatedUser) {
    if (actor.role !== Role.STUDENT) throw new ForbiddenException();
    const scope = await this.scopes.getStudentScope(actor.id, actor.schoolId);
    const owned = { studentId: actor.id, schoolId: actor.schoolId };
    const [
      report,
      plans,
      coach,
      submissions,
      mastery,
      weeks,
      modules,
      bank,
      labs,
      mocks,
      marks,
    ] = await Promise.all([
      this.db.learningCoachReportCard.findFirst({
        where: { ...owned, status: "ANALYZED" },
        orderBy: { analyzedAt: "desc" },
        select: { diagnosis: true, analyzedAt: true },
      }),
      this.db.learningCoachPlan.findMany({
        where: { ...owned, grade: `Grade ${scope.grade}` },
        orderBy: { updatedAt: "desc" },
      }),
      this.db.learningCoachSession.findMany({
        where: {
          ...owned,
          completedAt: { not: null },
          plan: { grade: `Grade ${scope.grade}` },
        },
        include: { plan: { select: { subject: true, topic: true } } },
        orderBy: { completedAt: "desc" },
        take: 300,
      }),
      this.db.submission.findMany({
        where: {
          studentId: actor.id,
          resultsReleasedAt: { not: null },
          score: { not: null },
          status: { in: ["GRADED", "RETURNED"] },
          assignment: {
            schoolId: actor.schoolId,
            grade: `Grade ${scope.grade}`,
          },
        },
        include: {
          assignment: {
            select: {
              subject: true,
              title: true,
              maxPoints: true,
              rawJson: true,
            },
          },
        },
        orderBy: { resultsReleasedAt: "desc" },
        take: 300,
      }),
      this.db.studentMasteryProgress.findMany({
        where: {
          studentId: actor.id,
          lastAttemptAt: { not: null },
          module: { grade: scope.grade },
        },
        include: { module: { select: { subject: true, topic: true } } },
        orderBy: { lastAttemptAt: "desc" },
        take: 200,
      }),
      this.db.study_Timetable.findMany({
        where: { student_id: actor.id, school_id: actor.schoolId },
        orderBy: { week_start: "desc" },
        take: 16,
      }),
      this.scopes.modules(scope),
      this.db.questionBank.groupBy({
        by: ["subject", "topic"],
        where: {
          grade: `Grade ${scope.grade}`,
          isGlobal: true,
          status: "APPROVED",
          correctAnswer: { not: null },
          questionType: {
            in: [
              "MULTIPLE_CHOICE",
              "TRUE_FALSE",
              "FILL_BLANK",
              "NUMERIC",
              "SHORT_ANSWER",
            ],
          },
        },
        _count: { id: true },
      }),
      this.db.labSession.findMany({
        where: {
          ...owned,
          quizCompletedAt: { not: null },
          maxScore: { gt: 0 },
        },
        select: {
          labKey: true,
          score: true,
          maxScore: true,
          quizCompletedAt: true,
        },
        orderBy: { quizCompletedAt: "desc" },
        take: 100,
      }),
      this.db.kjseaMockAttempt.findMany({
        where: {
          ...owned,
          status: "SUBMITTED",
          completedAt: { not: null },
          score: { not: null },
          NOT: { questions: { array_contains: [{ manualSelfReview: true }] } },
        },
        select: {
          subject: true,
          score: true,
          coverage: true,
          completedAt: true,
        },
        orderBy: { completedAt: "desc" },
        take: 100,
      }),
      this.db.studentAcademicResult.findMany({
        where: {
          ...owned,
          batch: { status: "COMPLETED", grade: `Grade ${scope.grade}` },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);
    const signals: LearningSignal[] = [];
    const add = (
      subject: string,
      topic: string | null,
      score: number,
      at: Date | string,
      source: string,
    ) => {
      if (
        Number.isFinite(score) &&
        score >= 0 &&
        score <= 100 &&
        allowedAssignmentSubject(scope, subject)
      )
        signals.push({
          subject,
          topic,
          score: Math.round(score),
          at: new Date(at).toISOString(),
          source,
        });
    };
    coach.forEach((s) =>
      add(s.plan.subject, s.plan.topic, s.score, s.completedAt!, "Coach quiz"),
    );
    submissions.forEach((s) => {
      if (s.assignment.maxPoints > 0)
        add(
          s.assignment.subject,
          null,
          (100 * s.score!) / s.assignment.maxPoints,
          s.resultsReleasedAt!,
          "Released assignment",
        );
    });
    // Best score is a mastery snapshot, not a latest-attempt score. Keep that distinction visible.
    mastery
      .filter(
        (s) =>
          !submissions.some(
            (a) => (a.assignment.rawJson as any)?.cms_module_id === s.moduleId,
          ),
      )
      .forEach((s) =>
        add(
          s.module.subject,
          s.module.topic,
          s.bestScore,
          s.lastAttemptAt!,
          "Batch best score",
        ),
      );
    for (const w of weeks)
      for (const r of recallRecords(w.plan_json))
        add(
          r.subject,
          r.topic,
          (100 * r.score) / r.total,
          r.completed_at,
          "Timetable recall",
        );
    const labMetadata = labs.length
      ? await this.db.lab.findMany({
          where: {
            key: { in: labs.map((l) => l.labKey) },
            grade: `Grade ${scope.grade}`,
          },
          select: { key: true, subject: true },
        })
      : [];
    labs.forEach((l) => {
      const m = labMetadata.find((m) => m.key === l.labKey);
      if (m && l.score !== null)
        add(
          m.subject,
          null,
          (100 * l.score) / l.maxScore!,
          l.quizCompletedAt!,
          "Lab quiz",
        );
    });
    mocks.forEach((m) => {
      const c = m.coverage as any;
      if (
        c?.grade === `Grade ${scope.grade}` &&
        c.totalMarks > 0 &&
        m.score !== null
      )
        add(
          m.subject,
          null,
          (100 * m.score) / c.totalMarks,
          m.completedAt!,
          "Mock quiz",
        );
    });
    const baseline = new Map<string, { subject: string; score: number }>();
    const diagnosis = report?.diagnosis as any;
    for (const s of diagnosis?.colorCodes ?? [])
      if (
        typeof s.subject === "string" &&
        typeof s.percentage === "number" &&
        allowedAssignmentSubject(scope, s.subject)
      )
        baseline.set(subjectKey(s.subject), {
          subject: s.subject,
          score: s.percentage,
        });
    const seenMarks = new Set<string>();
    for (const m of marks) {
      const sk = subjectKey(m.subject);
      if (seenMarks.has(sk)) continue;
      seenMarks.add(sk);
      if (
        allowedAssignmentSubject(scope, m.subject) &&
        (!baseline.has(sk) ||
          !report?.analyzedAt ||
          m.createdAt.getTime() > report.analyzedAt.getTime())
      )
        baseline.set(sk, { subject: m.subject, score: m.percentage });
    }
    const subjects = [
      ...new Set(
        [...baseline.values()]
          .map((s) => s.subject)
          .concat(
            signals.map((s) => s.subject),
            plans.map((s) => s.subject),
          ),
      ),
    ].filter((s) => allowedAssignmentSubject(scope, s));
    const unique = [
      ...new Map(subjects.map((s) => [subjectKey(s), s])).values(),
    ];
    const now = new Date();
    const queue = unique
      .map((subject) => {
        const sk = subjectKey(subject),
          subjectSignals = signals.filter((s) => subjectKey(s.subject) === sk),
          base = baseline.get(sk)?.score ?? null;
        const ps = plans.filter((p) => subjectKey(p.subject) === sk);
        const due =
          ps
            .map((p) => p.nextReviewAt?.toISOString())
            .filter((s): s is string => !!s)
            .sort()[0] ?? null;
        const state = recoveryPriority(base, subjectSignals, now, due);
        const topicNames = [
          ...new Map(
            [
              ...subjectSignals.filter((s) => s.topic).map((s) => s.topic!),
              ...ps.map((p) => p.topic),
              ...bank
                .filter((b) => subjectKey(b.subject) === sk)
                .map((b) => b.topic),
              ...modules
                .filter((m) => subjectKey(m.subject) === sk)
                .map((m) => m.topic),
            ].map((t) => [key(t), t]),
          ).values(),
        ];
        const topicPriority = (topic: string) =>
          recoveryPriority(
            null,
            subjectSignals.filter((s) => key(s.topic) === key(topic)),
            now,
            ps
              .find((p) => key(p.topic) === key(topic))
              ?.nextReviewAt?.toISOString() ?? null,
          ).priority;
        const topics = topicNames
          .sort(
            (a, b) => topicPriority(b) - topicPriority(a) || a.localeCompare(b),
          )
          .slice(0, 4);
        return {
          subject,
          baseline: base,
          ...state,
          nextReviewAt: due,
          latest:
            subjectSignals.sort((a, b) => b.at.localeCompare(a.at))[0] ?? null,
          needsSupport: ps.some((p) => p.requiresHumanSupport),
          topics: topics.map((topic) => ({
            topic,
            diagnosticReady: bank.some(
              (b) =>
                subjectKey(b.subject) === sk &&
                key(b.topic) === key(topic) &&
                b._count.id >= 3,
            ),
            resources: modules
              .filter(
                (m) =>
                  subjectKey(m.subject) === sk && key(m.topic) === key(topic),
              )
              .slice(0, 3)
              .map((m) => ({
                id: m.id,
                topic: m.topic,
                type: m.content_type,
                questionCount: m.question_count,
                href: `/student/study-hub/library?module=${encodeURIComponent(m.id)}`,
              })),
          })),
        };
      })
      .sort(
        (a, b) => b.priority - a.priority || a.subject.localeCompare(b.subject),
      );
    return {
      generatedAt: now.toISOString(),
      queue,
      signalCount: signals.length,
      notice:
        "Priorities refresh from completed Coach quizzes, timetable recall, lab/mock quizzes, batch best-score snapshots and released assignment results. Practice performance is not a formal school grade.",
    };
  }
}
