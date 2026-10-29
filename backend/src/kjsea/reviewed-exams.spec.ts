import { approvedChoices } from "./question-pool";
import {
  reviewedMathReady,
  reviewedMathExam,
  reviewedLanguageReady,
  reviewedLanguageExam,
} from "./reviewed-exams";
import { totalMarks } from "./exam-paper";
import { KjseaService } from "./kjsea.service";
const row = (
  id: number,
  type = "MULTIPLE_CHOICE",
  subject = "Mathematics",
) => ({
  id,
  subject,
  grade: "Grade 11",
  topic: `Topic ${id % 3}`,
  questionType: type,
  questionText: `Original question ${id}`,
  options: ["A", "B", "C", "D"],
  correctAnswer: type === "MULTIPLE_CHOICE" ? "B" : "12",
  explanation: "This follows the stated relationship in the question.",
  contentHtml: null,
  diagramUrl: null,
  diagramAlt: null,
  points: 1,
});
describe("Reviewed full papers for senior subjects", () => {
  it("builds a mixed 100-mark Mathematics paper from same-grade reviewed content", async () => {
    const choices = Array.from({ length: 20 }, (_, i) => row(i + 1)),
      written = Array.from({ length: 20 }, (_, i) => row(i + 21, "NUMERIC"));
    expect(reviewedMathReady(choices, written)).toBe(true);
    const paper = reviewedMathExam(
      approvedChoices(choices),
      written,
      2,
      new Set(),
    );
    expect(paper).toHaveLength(40);
    expect(totalMarks(paper)).toBe(100);
    expect(paper.slice(20).every((q) => q.responseType === "STRUCTURED")).toBe(
      true,
    );
    const model = {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(async ({ data }) => ({
        id: "senior",
        status: "DRAFT",
        createdAt: new Date(),
        completedAt: null,
        score: null,
        answers: {},
        ...data,
      })),
    };
    const service = new KjseaService({
      kjseaMockAttempt: model,
      questionBank: {
        findMany: jest.fn(async ({ where }) =>
          typeof where.questionType === "string" ? choices : written,
        ),
      },
    } as any);
    const actor = { id: 42, schoolId: 1, grade: "Grade 11" } as any;
    const catalogue = await service.subjects(actor);
    expect(
      catalogue.find((s) => s.source === "BANK" && s.subject === "Mathematics"),
    ).toMatchObject({
      fullPaperReady: true,
      totalMarks: 100,
      questionCount: 40,
    });
    const result = await service.create(
      { source: "BANK", subject: "Mathematics" },
      actor,
    );
    expect(result.totalMarks).toBe(100);
    expect(result.questions.every((q) => q.sourceGrade === "Grade 11")).toBe(
      true,
    );
    expect(result.questions[20].parts![0]).not.toHaveProperty("answer");
  });
  it("does not call a single-topic bank or choice-only bank a complete mixed paper", () => {
    const choices = Array.from({ length: 40 }, (_, i) => row(i + 1));
    expect(reviewedMathReady(choices, [])).toBe(false);
    expect(
      reviewedMathReady(
        choices.map((q) => ({ ...q, topic: "One topic" })),
        Array.from({ length: 20 }, (_, i) => ({
          ...row(i + 100, "NUMERIC"),
          topic: "One topic",
        })),
      ),
    ).toBe(false);
  });
  it("requires every language section and keeps shared passages consecutive", () => {
    let id = 1;
    const sections = [
      ["Dialogue", 5],
      ["Cloze", 5],
      ["Comprehension", 10],
      ["Language use", 10],
      ["Poetry", 5],
      ["Informational reading", 5],
    ] as const;
    const items = sections.flatMap(([topic, count]) =>
      Array.from({ length: count }, () => ({
        ...row(id++, "MULTIPLE_CHOICE", "English"),
        topic,
        contentHtml:
          topic === "Language use"
            ? null
            : `<p>Original shared stimulus for ${topic}.</p>`,
      })),
    );
    expect(reviewedLanguageReady(items)).toBe(true);
    const result = reviewedLanguageExam(approvedChoices(items), 3, new Set());
    expect(result).toHaveLength(40);
    expect(totalMarks(result)).toBe(40);
    expect(
      result
        .slice(0, 5)
        .every(
          (q) =>
            q.section === "Dialogue" && q.contentHtml === items[0].contentHtml,
        ),
    ).toBe(true);
    expect(
      reviewedLanguageReady(items.filter((q) => q.topic !== "Cloze")),
    ).toBe(false);
    expect(
      reviewedLanguageReady(items.map((q) => ({ ...q, contentHtml: null }))),
    ).toBe(false);
  });
});
