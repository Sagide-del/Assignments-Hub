import { recallRecords } from "../study-hub/recall-history";
import { RecoveryService, recoveryPriority } from "./recovery.service";
import {
  EngagementReportService,
  renderEngagementPdf,
} from "./engagement-report.service";
import { LearningCoachService } from "./learning-coach.service";
import { Role } from "../common/enums/role.enum";
const actor = {
  id: 1,
  schoolId: 8,
  role: Role.STUDENT,
  grade: "Grade 10",
} as any;
const scope = {
  student_id: 1,
  school_id: 8,
  grade: 10,
  subjects: ["Mathematics", "Biology"],
  assignment_subjects: ["Core Mathematics", "Biology"],
};
const scopes = {
  getStudentScope: jest.fn().mockResolvedValue(scope),
  modules: jest.fn().mockResolvedValue([
    {
      id: "math-module",
      subject: "Core Mathematics",
      topic: "Algebra",
      content_type: "ASSIGNMENT",
      question_count: 30,
    },
  ]),
};
const now = new Date("2026-11-25T12:00:00Z");
const signal = (score: number, at = "2026-11-24T12:00:00Z") => ({
  subject: "Mathematics",
  topic: "Algebra",
  score,
  at,
  source: "Coach quiz",
});
function dbFixture() {
  return {
    learningCoachReportCard: {
      findFirst: jest.fn().mockResolvedValue({
        diagnosis: {
          colorCodes: [
            { subject: "Core Mathematics", percentage: 20 },
            { subject: "Biology", percentage: 65 },
            { subject: "History", percentage: 10 },
          ],
        },
      }),
    },
    learningCoachPlan: { findMany: jest.fn().mockResolvedValue([]) },
    learningCoachSession: { findMany: jest.fn().mockResolvedValue([]) },
    submission: { findMany: jest.fn().mockResolvedValue([]) },
    studentMasteryProgress: { findMany: jest.fn().mockResolvedValue([]) },
    study_Timetable: { findMany: jest.fn().mockResolvedValue([]) },
    questionBank: {
      groupBy: jest
        .fn()
        .mockResolvedValue([
          { subject: "Mathematics", topic: "Algebra", _count: { id: 6 } },
        ]),
    },
    labSession: { findMany: jest.fn().mockResolvedValue([]) },
    kjseaMockAttempt: { findMany: jest.fn().mockResolvedValue([]) },
    studentAcademicResult: { findMany: jest.fn().mockResolvedValue([]) },
  };
}
describe("Closed-loop learning priorities", () => {
  test("weak report score prioritises Math, but recent improvements move it to maintenance", () => {
    expect(recoveryPriority(20, [], now, null).stage).toBe("REBUILD");
    expect(recoveryPriority(20, [signal(90)], now, null).stage).toBe(
      "MAINTAIN",
    );
    expect(recoveryPriority(20, [signal(90)], now, null).priority).toBeLessThan(
      recoveryPriority(65, [], now, null).priority,
    );
  });
  test("new weak quizzes create a recovery need; due reviews return after improvement", () => {
    expect(recoveryPriority(85, [signal(35)], now, null).stage).toBe("REBUILD");
    expect(
      recoveryPriority(20, [signal(90)], now, "2026-11-25T08:00:00Z").stage,
    ).toBe("REVIEW");
  });
  test("old quizzes do not permanently override current report baseline", () =>
    expect(
      recoveryPriority(70, [signal(10, "2025-01-01T00:00:00Z")], now, null)
        .current,
    ).toBe(70));
  test("recommendations use explicit enrolment, canonical Math names and approved distributed modules", async () => {
    const db = dbFixture(),
      result = await new RecoveryService(db as any, scopes as any).load(actor);
    expect(result.queue.map((s) => s.subject)).toEqual([
      "Core Mathematics",
      "Biology",
    ]);
    expect(result.queue[0].topics[0]).toMatchObject({
      topic: "Algebra",
      diagnosticReady: true,
      resources: [
        {
          id: "math-module",
          href: "/student/study-hub/library?module=math-module",
        },
      ],
    });
    expect(db.submission.findMany.mock.calls[0][0].where).toMatchObject({
      studentId: 1,
      resultsReleasedAt: { not: null },
      assignment: { schoolId: 8, grade: "Grade 10" },
    });
  });
  test("timed recall results feed the same recovery queue and unavailable content is honest", async () => {
    const db = dbFixture();
    db.study_Timetable.findMany.mockResolvedValue([
      {
        plan_json: {
          days: [
            { blocks: [{ id: "quiz", subject: "Biology", topic: "Cells" }] },
          ],
          quiz_results: {
            quiz: {
              score: 0,
              total: 3,
              completed_at: new Date().toISOString(),
            },
          },
        },
      },
    ] as any);
    const result = await new RecoveryService(db as any, scopes as any).load(
      actor,
    );
    expect(result.queue[0]).toMatchObject({
      subject: "Biology",
      stage: "REBUILD",
      current: 0,
    });
    expect(result.queue[0].topics[0]).toMatchObject({
      topic: "Cells",
      resources: [],
      diagnosticReady: false,
    });
  });
  test("non-students cannot request private recovery data", async () =>
    await expect(
      new RecoveryService({} as any, scopes as any).load({
        ...actor,
        role: Role.TEACHER,
      }),
    ).rejects.toThrow());
});
describe("School-approved report baseline updates", () => {
  test("newer published school results replace an older uploaded-report baseline", async () => {
    const db = dbFixture();
    db.learningCoachReportCard.findFirst.mockResolvedValue({
      analyzedAt: new Date("2026-01-01"),
      diagnosis: { colorCodes: [{ subject: "Mathematics", percentage: 20 }] },
    } as any);
    db.studentAcademicResult.findMany.mockResolvedValue([
      {
        subject: "Mathematics",
        percentage: 75,
        createdAt: new Date("2026-11-25"),
      },
    ] as any);
    const result = await new RecoveryService(db as any, scopes as any).load(
      actor,
    );
    expect(result.queue[0].baseline).toBe(75);
  });
});
describe("Private one-page engagement report", () => {
  test("rejects arbitrary student access and unsupported report periods", async () => {
    const service = new EngagementReportService({} as any, {} as any);
    await expect(
      service.data({ ...actor, role: Role.TEACHER }, 30),
    ).rejects.toThrow();
    await expect(service.data(actor, 365)).rejects.toThrow("7, 30 or 90");
  });
  test("aggregates actual engagement, keeps un-released grades hidden and handles no score", async () => {
    const db: any = dbFixture();
    db.user = {
      findFirstOrThrow: jest.fn().mockResolvedValue({
        name: "A learner",
        grade: "Grade 10",
        admissionNumber: "A1",
        school: { name: "School A" },
      }),
    };
    db.auditLog = {
      findMany: jest.fn().mockResolvedValue([{ createdAt: new Date() }]),
    };
    db.userPresenceSession = { findMany: jest.fn().mockResolvedValue([]) };
    db.skillLessonProgress = { findMany: jest.fn().mockResolvedValue([]) };
    db.music_Project = { findMany: jest.fn().mockResolvedValue([]) };
    db.music_Studio_Project = { findMany: jest.fn().mockResolvedValue([]) };
    db.sports_Lab_Progress = { findMany: jest.fn().mockResolvedValue([]) };
    db.submission.findMany.mockResolvedValue([
      {
        completedAt: new Date(),
        resultsReleasedAt: null,
        score: 99,
        assignment: {
          title: "Private result",
          subject: "Biology",
          maxPoints: 100,
        },
      },
    ]);
    const r = await new EngagementReportService(db, {
      load: async () => ({ queue: [] }),
    } as any).data(actor, 7);
    expect(r.summary).toMatchObject({
      logins: 1,
      subjects: 1,
      activities: 1,
      average: null,
    });
    expect(r.events.find((e) => e.kind === "Assignment")?.score).toBeNull();
    expect(r.daily).toHaveLength(7);
    expect(r.daily.at(-1)?.count).toBe(1);
    expect(db.auditLog.findMany.mock.calls[0][0].where).toMatchObject({
      userId: 1,
      schoolId: 8,
      action: "auth.login",
    });
  });
  test("renders exactly one branded PDF page even with long names and many events", async () => {
    const r: any = {
      student: {
        name: "Long learner name ".repeat(20),
        grade: "Grade 10",
        admissionNumber: "DEMO1",
        school: { name: "Demo Academy" },
      },
      period: { from: now.toISOString(), to: now.toISOString(), days: 30 },
      summary: {
        activeDays: 12,
        subjects: 10,
        activities: 100,
        average: 68,
        logins: 20,
        lastLogin: now.toISOString(),
        timetableCompleted: 6,
        timetableTotal: 8,
      },
      subjectScores: Array.from({ length: 15 }, (_, i) => ({
        subject: "Very long subject name ".repeat(10),
        average: i * 6,
        count: 3,
      })),
      daily: Array.from({ length: 30 }, (_, i) => ({
        date: "2026-11-25",
        count: i % 5,
      })),
      priorities: [{ subject: "Mathematics", stage: "REBUILD", current: 30 }],
      events: Array.from({ length: 100 }, () => ({
        at: now.toISOString(),
        kind: "Coach quiz",
        title: "Very long activity name ".repeat(20),
        score: 60,
      })),
    };
    const pdf = await renderEngagementPdf(r);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).toHaveLength(
      1,
    );
  });
});
describe("Coach practice integrity", () => {
  test("does not allow a direct request for an unenrolled subject", async () => {
    const service = new LearningCoachService(
      {} as any,
      {} as any,
      {} as any,
      scopes as any,
    );
    await expect(
      service.start({ subject: "History", topic: "Any" }, actor),
    ).rejects.toThrow("enrolled curriculum");
  });
  test("the worked example is excluded from the independent practice questions", async () => {
    const db: any = dbFixture();
    db.questionBank.findMany = jest.fn().mockResolvedValue(
      Array.from({ length: 4 }, (_, i) => ({
        id: i + 1,
        subject: "Mathematics",
        questionText: `Q${i}`,
        questionType: "NUMERIC",
        correctAnswer: "4",
        learningCoachResponses: [],
        sourceDocument: null,
      })),
    );
    db.learningCoachPlan.upsert = jest.fn().mockResolvedValue({ id: 10 });
    db.learningCoachSession.create = jest
      .fn()
      .mockImplementation(async ({ data }: any) => ({ id: 1, ...data }));
    const service = new LearningCoachService(
      db,
      { record: jest.fn() } as any,
      {} as any,
      scopes as any,
    );
    const r = await service.start(
      { subject: "Core Mathematics", topic: "Algebra" },
      actor,
    );
    expect(r.lesson.workedExample).toBe("Q0");
    expect(r.questions.map((q) => q.questionText)).not.toContain("Q0");
    expect(r.session.total).toBe(3);
  });
});

describe("Timetable recall history", () => {
  test("preserved quiz results count once after a refresh and old removed blocks remain evidence", () => {
    const old = {
      days: [
        { blocks: [{ id: "b", subject: "Mathematics", topic: "Algebra" }] },
      ],
      quiz_results: {
        b: { score: 1, total: 3, completed_at: "2026-11-25T08:00:00Z" },
      },
    };
    const archive = recallRecords(old);
    expect(recallRecords({ ...old, recall_history: archive })).toHaveLength(1);
    expect(
      recallRecords({ days: [], quiz_results: {}, recall_history: archive }),
    ).toEqual(archive);
    const newer = {
      ...old,
      recall_history: archive,
      quiz_results: {
        b: {
          event_id: "new-attempt",
          score: 3,
          total: 3,
          completed_at: "2026-11-25T09:00:00Z",
        },
      },
    };
    expect(recallRecords(newer).map((r) => r.score)).toEqual([1, 3]);
  });
});
