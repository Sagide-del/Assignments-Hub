import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { LearningCoachService } from "./learning-coach.service";
import { RecoveryService } from "./recovery.service";
import { EngagementReportService } from "./engagement-report.service";
import { StudentScopeService } from "../student/student-scope.service";
import { Role } from "../common/enums/role.enum";
const run = process.env.LEARNING_HUB_TEST_DATABASE_URL
  ? describe
  : describe.skip;
run(
  "Learning loop: isolated PostgreSQL, answer locks and parent reporting",
  () => {
    let db: PrismaClient,
      coach: LearningCoachService,
      recovery: RecoveryService,
      report: EngagementReportService,
      school: any,
      otherSchool: any,
      student: any,
      other: any,
      actor: any;
    const topic = "Learning loop " + randomUUID(),
      taxonomy = randomUUID();
    beforeAll(async () => {
      const url = new URL(process.env.LEARNING_HUB_TEST_DATABASE_URL!);
      if (url.hostname !== "127.0.0.1" || url.pathname !== "/coach_loop_test")
        throw Error("Disposable localhost coach_loop_test only");
      db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
      await db.$connect();
      school = await db.school.create({
        data: {
          name: "Loop fixture",
          code: randomUUID(),
          subscriptionStatus: "ACTIVE",
        },
      });
      otherSchool = await db.school.create({
        data: {
          name: "Other school",
          code: randomUUID(),
          subscriptionStatus: "ACTIVE",
        },
      });
      student = await db.user.create({
        data: {
          name: "Loop learner",
          role: "STUDENT",
          schoolId: school.id,
          grade: "Grade 10",
          elective_subjects: ["Biology", "Chemistry", "Physics"],
        },
      });
      other = await db.user.create({
        data: {
          name: "Other learner",
          role: "STUDENT",
          schoolId: otherSchool.id,
          grade: "Grade 10",
          elective_subjects: ["Biology", "Chemistry", "Physics"],
        },
      });
      await db.curriculumTaxonomy.create({
        data: {
          id: taxonomy,
          level: "Senior School",
          grade: 10,
          pathway: "STEM",
          track: "Pure Sciences",
          subject: "Core Mathematics",
          topics: [topic],
        },
      });
      await db.questionBank.createMany({
        data: Array.from({ length: 4 }, (_, i) => ({
          createdById: student.id,
          subject: "Mathematics",
          grade: "Grade 10",
          topic,
          questionText: `Solve question ${i + 1}`,
          questionType: "NUMERIC" as const,
          correctAnswer: "4",
          config: { numeric: { acceptedValue: 4, tolerance: 0 } },
          explanation: "A reviewed worked example.",
          status: "APPROVED" as const,
          isGlobal: true,
        })),
      });
      actor = {
        id: student.id,
        schoolId: school.id,
        role: Role.STUDENT,
        grade: "Grade 10",
      };
      const scopes = new StudentScopeService(db as any);
      coach = new LearningCoachService(
        db as any,
        { record: jest.fn() } as any,
        {} as any,
        scopes,
      );
      recovery = new RecoveryService(db as any, scopes);
      report = new EngagementReportService(db as any, recovery);
    });
    afterAll(async () => {
      if (!db) return;
      if (school) {
        await db.learningCoachResponse.deleteMany({
          where: { schoolId: school.id },
        });
        await db.learningCoachSession.deleteMany({
          where: { schoolId: school.id },
        });
        await db.questionBank.deleteMany({ where: { topic } });
        await db.school.delete({ where: { id: school.id } });
      }
      if (otherSchool)
        await db.school.delete({ where: { id: otherSchool.id } });
      await db.curriculumTaxonomy.deleteMany({ where: { id: taxonomy } });
      await db.$disconnect();
    });
    test("concurrent answer replay completes once and cannot rewrite a wrong answer", async () => {
      const session = await coach.start(
        { subject: "Core Mathematics", topic, mode: "PRACTICE" },
        actor,
      );
      expect(session.questions).toHaveLength(3);
      expect(session.questions.map((q) => q.questionText)).not.toContain(
        session.lesson.workedExample,
      );
      for (const q of session.questions.slice(0, -1))
        await coach.answer(
          session.session.id,
          { questionId: q.id, answer: "0" },
          actor,
        );
      const last = session.questions.at(-1)!;
      const results = await Promise.all([
        coach.answer(
          session.session.id,
          { questionId: last.id, answer: "0" },
          actor,
        ),
        coach.answer(
          session.session.id,
          { questionId: last.id, answer: "0" },
          actor,
        ),
      ]);
      expect(results.every((r) => r.completed && r.score === 0)).toBe(true);
      expect(
        await db.learningCoachResponse.count({
          where: { sessionId: session.session.id },
        }),
      ).toBe(3);
      expect(
        (
          await db.learningCoachPlan.findUniqueOrThrow({
            where: { id: session.plan.id },
          })
        ).lowPerformanceStreak,
      ).toBe(1);
      await expect(
        coach.answer(
          session.session.id,
          { questionId: last.id, answer: "4" },
          actor,
        ),
      ).rejects.toThrow("already recorded");
      await expect(
        coach.answer(
          session.session.id,
          { questionId: last.id, answer: "0" },
          { ...actor, id: other.id, schoolId: otherSchool.id },
        ),
      ).rejects.toThrow("not found");
    });
    test("a completed quiz creates a new weakness without needing an uploaded report", async () => {
      const result = await recovery.load(actor),
        math = result.queue.find((s) => s.subject === "Core Mathematics");
      expect(math).toMatchObject({ current: 0, stage: "REBUILD" });
      expect(
        math?.topics.some((t) => t.topic === topic && t.diagnosticReady),
      ).toBe(true);
      const foreign = await recovery.load({
        ...actor,
        id: other.id,
        schoolId: otherSchool.id,
      });
      expect(foreign.signalCount).toBe(0);
    });
    test("student-owned report includes real sign-in times and quiz activity, never another school", async () => {
      await db.auditLog.create({
        data: { userId: student.id, schoolId: school.id, action: "auth.login" },
      });
      await db.auditLog.create({
        data: {
          userId: other.id,
          schoolId: otherSchool.id,
          action: "auth.login",
        },
      });
      const r = await report.data(actor, 7);
      expect(r.summary).toMatchObject({
        logins: 1,
        subjects: 1,
        activities: 1,
        average: 0,
      });
      expect(
        r.events.some((e) => e.kind === "Coach quiz" && e.score === 0),
      ).toBe(true);
      const foreign = await report.data(
        { ...actor, id: other.id, schoolId: otherSchool.id },
        7,
      );
      expect(foreign.summary.activities).toBe(0);
      expect(foreign.student.name).toBe("Other learner");
      const pdf = await report.pdf(actor, 7);
      expect(
        pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? [],
      ).toHaveLength(1);
    });
  },
);
