import { PracticeService } from "./practice.service";
import { approvedPractice, practicePaper } from "./practice-questions";
import { questionMarks } from "../kjsea/exam-paper";
const actor = { id: 42, schoolId: 1, grade: "Grade 7" } as any;
const make = (id: number, type = "MULTIPLE_CHOICE") => ({
  id,
  grade: "Grade 7",
  subject: "Mathematics",
  topic: "Fractions",
  questionType: type,
  questionText: `Question ${id}`,
  options: ["A", "B", "C", "D"],
  correctAnswer: type === "MULTIPLE_CHOICE" ? "B" : "one half",
  explanation: "A complete explanation of the answer.",
  points: 2,
  contentHtml: null,
  diagramUrl: null,
  diagramAlt: null,
});
function fixture(rows: any[]) {
  const tx: any = {
    $executeRaw: jest.fn(),
    questionBank: { findMany: jest.fn().mockResolvedValue(rows) },
    kjseaMockAttempt: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest
        .fn()
        .mockImplementation(async ({ data }) => ({ id: "topic", ...data })),
    },
  };
  const p: any = {
    ...tx,
    school: {
      findUnique: jest.fn().mockResolvedValue({ code: "INDEPENDENT" }),
    },
    curriculumScope: {
      findMany: jest.fn().mockResolvedValue([{ subject: "Mathematics" }]),
    },
    $transaction: jest.fn((fn) => fn(tx)),
    subscription: { findFirst: jest.fn().mockResolvedValue(null) },
    schoolQuestionBankAccess: { findUnique: jest.fn().mockResolvedValue(null) },
  };
  return { tx, p, service: new PracticeService(p) };
}
describe("Assignment topic practice", () => {
  it("opens approved topic questions even when a topic has fewer than 30, scoped to the learner grade", async () => {
    const { service, tx } = fixture([make(1), make(2)]);
    expect(await service.start("Mathematics", actor, "Fractions")).toEqual({
      id: "topic",
      resumed: false,
    });
    expect(tx.questionBank.findMany.mock.calls[0][0].where).toMatchObject({
      isGlobal: true,
      status: "APPROVED",
      topic: { equals: "Fractions" },
      grade: { in: ["Grade 7", "Grade7", "7"] },
    });
    expect(tx.kjseaMockAttempt.create.mock.calls[0][0].data).toMatchObject({
      source: "PRACTICE",
      coverage: { topic: "Fractions", questionCount: 2 },
    });
  });
  it("resumes only the matching topic and exposes a subject/topic catalogue", async () => {
    const { service, p, tx } = fixture([make(1), make(2)]);
    p.kjseaMockAttempt.findMany.mockResolvedValue([]);
    const catalogue = await service.subjects(actor);
    expect(catalogue.subjects[0].topics).toEqual([
      { topic: "Fractions", count: 2 },
    ]);
    tx.kjseaMockAttempt.findFirst.mockResolvedValue({ id: "existing" });
    expect(await service.start("Mathematics", actor, "Fractions")).toEqual({
      id: "existing",
      resumed: true,
    });
    expect(tx.kjseaMockAttempt.findFirst.mock.calls[0][0].where.AND).toEqual([
      { coverage: { path: ["topic"], equals: "Fractions" } },
    ]);
  });
  it("uses text/numeric responses and preserves essays as explicitly ungraded self-review", () => {
    const rows = [
      make(1),
      make(2, "SHORT_ANSWER"),
      {
        ...make(3, "NUMERIC"),
        correctAnswer: "0.5",
        config: { numeric: { acceptedValue: 0.5 } },
      },
      make(4, "ESSAY"),
    ];
    const paper = practicePaper(approvedPractice(rows), 4);
    expect(paper).toHaveLength(4);
    expect(
      questionMarks(paper[1], {
        responses: { answer: "ONE HALF" },
        working: "",
      }),
    ).toBe(2);
    expect(
      questionMarks(paper[2], { responses: { answer: "1/2" }, working: "" }),
    ).toBe(2);
    expect(paper[3].manualSelfReview).toBe(true);
    expect(
      questionMarks(paper[3], {
        responses: { answer: "one half" },
        working: "",
      }),
    ).toBe(0);
  });
  it("requires both an active subscription and bank activation for school students", async () => {
    const { p, service, tx } = fixture([make(1)]);
    p.school.findUnique.mockResolvedValue({ code: "SCHOOL" });
    await expect(
      service.start("Mathematics", actor, "Fractions"),
    ).rejects.toThrow("teachers");
    expect(tx.kjseaMockAttempt.create).not.toHaveBeenCalled();
    p.subscription.findFirst.mockResolvedValue({
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 86400000),
    });
    p.schoolQuestionBankAccess.findUnique.mockResolvedValue({ active: true });
    expect(
      await service.start("Mathematics", actor, "Fractions"),
    ).toMatchObject({ id: "topic" });
  });
});
