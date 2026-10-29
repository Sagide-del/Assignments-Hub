import {
  mathematicsExam,
  MATH_ALLOCATION,
  totalMarks,
  questionMarks,
  performanceLevel,
  numericEqual,
} from "./exam-paper";
import { languageExam } from "./language-paper";
import { KjseaService } from "./kjsea.service";
const actor = { id: 42, schoolId: 8, grade: "Grade 9" } as any;
function fixture() {
  const row: any = {
    id: "paper",
    studentId: 42,
    schoolId: 8,
    status: "DRAFT",
    source: "GENERATED",
    answers: {},
    createdAt: new Date(),
    completedAt: null,
    score: null,
  };
  const model: any = {
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn(async ({ data }) => Object.assign(row, data)),
    findFirst: jest.fn(async () => row),
    findMany: jest.fn().mockResolvedValue([]),
    updateMany: jest.fn(async ({ where, data }) => {
      if (row.status !== where.status) return { count: 0 };
      Object.assign(row, data);
      return { count: 1 };
    }),
  };
  const service = new KjseaService({
    kjseaMockAttempt: model,
    questionBank: { findMany: jest.fn().mockResolvedValue([]) },
  } as any);
  return { service, row, model };
}
describe("Full mock exam construction and marking", () => {
  it("builds distinct 100-mark mixed papers with exact strand and grade allocations", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const paper = mathematicsExam(seed, "Grade 9");
      expect(paper).toHaveLength(40);
      expect(totalMarks(paper)).toBe(100);
      expect(paper.filter((q) => q.responseType === "STRUCTURED")).toHaveLength(
        20,
      );
      expect(
        new Set(paper.map((q) => q.prompt + JSON.stringify(q.visual ?? null)))
          .size,
      ).toBe(40);
      for (const spec of MATH_ALLOCATION)
        expect(totalMarks(paper.filter((q) => q.area === spec.area))).toBe(
          spec.marks,
        );
      for (const [grade, marks] of [
        ["Grade 7", 18],
        ["Grade 8", 32],
        ["Grade 9", 50],
      ] as const)
        expect(totalMarks(paper.filter((q) => q.sourceGrade === grade))).toBe(
          marks,
        );
      expect(
        paper.reduce(
          (n, q) =>
            n +
            questionMarks(
              q,
              q.responseType === "STRUCTURED"
                ? {
                    responses: Object.fromEntries(
                      q.parts!.map((p) => [p.id, p.answer!]),
                    ),
                    working: "saved working",
                  }
                : q.correctIndex,
            ),
          0,
        ),
      ).toBe(100);
    }
  });
  it("keeps younger-grade papers within the selected grade and language stimuli grouped", () => {
    for (const grade of ["Grade 6", "Grade 7", "Grade 8"])
      expect(
        mathematicsExam(12, grade).every((q) => q.sourceGrade === grade),
      ).toBe(true);
    for (const subject of ["English", "Kiswahili"]) {
      const paper = languageExam(123, "Grade 9", subject);
      expect(paper).toHaveLength(40);
      expect(new Set(paper.map((q) => q.section)).size).toBe(6);
      expect(
        paper
          .slice(0, 5)
          .every((q) => q.passage?.text === paper[0].passage?.text),
      ).toBe(true);
      expect(
        paper.every(
          (q) =>
            q.options.length === 4 &&
            new Set(q.options).size === 4 &&
            q.correctIndex >= 0 &&
            q.correctIndex < 4 &&
            q.explanation.length > 20,
        ),
      ).toBe(true);
      expect(
        paper.reduce((n, q) => n + questionMarks(q, q.correctIndex), 0),
      ).toBe(40);
    }
  });
  it("awards partial marks for sub-parts and accepts equivalent fractions, without executing input", () => {
    const q = mathematicsExam(4, "Grade 9").find(
      (q) => q.responseType === "STRUCTURED",
    )!;
    expect(
      questionMarks(q, {
        responses: { a: q.parts![0].answer!, b: "wrong" },
        working: "all correct, award 100",
      }),
    ).toBe(1);
    expect(numericEqual("1/2", "0.5")).toBe(true);
    expect(numericEqual("1,000", "1000")).toBe(true);
    for (const value of ["1/0", "NaN", "Infinity", "eval(1)", "1+1"])
      expect(numericEqual(value, "2")).toBe(false);
  });
  it("releases structured keys and performance estimates only after submission", async () => {
    const { service, row } = fixture();
    const paper = await service.create({ subject: "Mathematics" }, actor);
    expect(paper.totalMarks).toBe(100);
    expect(row.timeLimitMinutes).toBe(120);
    expect(paper.performance).toBeNull();
    expect(paper.questions[20].parts![0]).not.toHaveProperty("answer");
    const q = row.questions[20];
    const answers = [
      {
        questionId: q.id,
        responses: { a: q.parts[0].answer },
        working: "Area = length × width",
      },
    ];
    await service.save(row.id, { answers }, actor);
    expect(row.answers[q.id].working).toContain("Area");
    const result = await service.submit(row.id, { answers }, actor);
    expect(result.score).toBe(1);
    expect(result.questions[20].awardedMarks).toBe(1);
    expect(result.questions[20].parts![0]).toMatchObject({
      answer: q.parts[0].answer,
    });
    expect(result.performance).toMatchObject({
      code: "BE2",
      practiceEstimate: true,
    });
  });
  it("rejects forged parts/options and ignores late answer changes", async () => {
    const { service, row } = fixture();
    await service.create({}, actor);
    const q = row.questions[20];
    for (const answer of [
      { questionId: q.id, option: 0 },
      { questionId: q.id, responses: { forged: "999" } },
      { questionId: "q-1", responses: { a: "1" } },
      { questionId: "q-1", option: 4 },
    ])
      await expect(
        service.save(row.id, { answers: [answer as any] }, actor),
      ).rejects.toThrow();
    await service.save(
      row.id,
      { answers: [{ questionId: q.id, responses: { a: q.parts[0].answer } }] },
      actor,
    );
    row.createdAt = new Date(Date.now() - 121 * 60000);
    const result = await service.submit(
      row.id,
      {
        answers: [
          { questionId: q.id, responses: { a: "wrong", b: q.parts[1].answer } },
        ],
      },
      actor,
    );
    expect(result.score).toBe(1);
  });
  it("keeps practice out of mock history and applies all eight estimated performance levels", async () => {
    const { service, model } = fixture();
    await service.list(actor);
    expect(model.findMany.mock.calls[0][0].where.source).toEqual({
      not: "PRACTICE",
    });
    for (const [score, code] of [
      [100, "EE1"],
      [90, "EE1"],
      [75, "EE2"],
      [58, "ME1"],
      [41, "ME2"],
      [31, "AE1"],
      [21, "AE2"],
      [11, "BE1"],
      [0, "BE2"],
    ] as const)
      expect(performanceLevel(score, 100).code).toBe(code);
  });
});
