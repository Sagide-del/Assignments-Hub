import { BadRequestException, NotFoundException } from "@nestjs/common";
import { KjseaService } from "./kjsea.service";
import { generatePaper } from "./mathematics";
const actor = { id: 42, schoolId: 8 } as any;
function setup() {
  const row: any = {
    id: "private-paper",
    schoolId: 8,
    studentId: 42,
    seed: 12,
    subject: "Mathematics",
    source: "GENERATED",
    coverage: { questionCount: 40, topicCount: 32, visualCount: 20 },
    version: "kjsea-maths-v1",
    status: "DRAFT",
    questions: generatePaper(12),
    answers: {},
    timeLimitMinutes: null,
    score: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const model = {
    count: jest.fn().mockResolvedValue(0),
    create: jest
      .fn()
      .mockImplementation(({ data }) => Promise.resolve({ ...row, ...data })),
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest
      .fn()
      .mockImplementation(({ where }) =>
        Promise.resolve(
          where.studentId === row.studentId &&
            where.schoolId === row.schoolId &&
            where.id === row.id
            ? row
            : null,
        ),
      ),
    updateMany: jest.fn().mockImplementation(({ where, data }) => {
      if (row.status !== where.status) return Promise.resolve({ count: 0 });
      Object.assign(row, data);
      return Promise.resolve({ count: 1 });
    }),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
  };
  return {
    service: new KjseaService({ kjseaMockAttempt: model } as any),
    model,
    row,
  };
}
describe("Private KJSEA mock attempts", () => {
  it("creates an account-scoped paper and hides answer keys, explanations and seed before submission", async () => {
    const { service, model } = setup();
    const paper = await service.create({}, actor);
    expect(model.create.mock.calls[0][0].data).toMatchObject({
      studentId: 42,
      schoolId: 8,
    });
    expect(paper.questions).toHaveLength(40);
    expect(paper.questions[0]).not.toHaveProperty("correctIndex");
    expect(paper.questions[0]).not.toHaveProperty("explanation");
    expect(paper).not.toHaveProperty("seed");
    expect(paper.score).toBeNull();
  });
  it("does not expose another student or school by id", async () => {
    const { service } = setup();
    await expect(
      service.get("private-paper", { ...actor, id: 43 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.get("private-paper", { ...actor, schoolId: 9 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
  it("saves answers and grades the server snapshot only on final submission", async () => {
    const { service, row } = setup();
    await service.save(
      row.id,
      {
        answers: [{ questionId: "q-1", option: row.questions[0].correctIndex }],
      },
      actor,
    );
    const result = await service.submit(
      row.id,
      {
        answers: [{ questionId: "q-2", option: row.questions[1].correctIndex }],
      },
      actor,
    );
    expect(result.score).toBe(2);
    expect(result.status).toBe("SUBMITTED");
    expect(result.questions[0]).toHaveProperty("explanation");
    await service.save(
      row.id,
      {
        answers: [
          {
            questionId: "q-1",
            option: (row.questions[0].correctIndex + 1) % 4,
          },
        ],
      },
      actor,
    );
    expect(row.score).toBe(2);
    expect(row.answers["q-1"]).toBe(row.questions[0].correctIndex);
  });
  it("uses only saved answers after the deadline and refuses late draft edits", async () => {
    const { service, row } = setup();
    row.timeLimitMinutes = 30;
    row.createdAt = new Date(Date.now() - 31 * 60000);
    row.answers = { "q-1": row.questions[0].correctIndex };
    await expect(
      service.save(
        row.id,
        {
          answers: [
            { questionId: "q-2", option: row.questions[1].correctIndex },
          ],
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    const result = await service.submit(
      row.id,
      {
        answers: [{ questionId: "q-2", option: row.questions[1].correctIndex }],
      },
      actor,
    );
    expect(result.score).toBe(1);
    expect(row.answers["q-2"]).toBeUndefined();
  });
  it("rejects invalid question IDs/options and limits unfinished papers", async () => {
    const { service, model, row } = setup();
    await expect(
      service.save(
        row.id,
        { answers: [{ questionId: "unknown", option: 0 }] },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.save(
        row.id,
        { answers: [{ questionId: "q-1", option: 4 }] },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    model.count.mockResolvedValue(5);
    await expect(service.create({}, actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
  it("returns a completed result idempotently without allowing score changes", async () => {
    const { service, row, model } = setup();
    await service.submit(
      row.id,
      {
        answers: [{ questionId: "q-1", option: row.questions[0].correctIndex }],
      },
      actor,
    );
    const result = await service.submit(row.id, { answers: [] }, actor);
    expect(result.score).toBe(1);
    expect(model.updateMany).toHaveBeenCalledTimes(1);
  });
});

describe("Subject catalogue and bank-backed generation", () => {
  const bankRow = (id: number, subject: string, grade = "Grade 9") => ({
    id,
    subject,
    grade,
    topic: "Reviewed topic",
    questionType: "MULTIPLE_CHOICE",
    questionText: `Question ${id} in ${subject}`,
    contentHtml: null,
    options: ["A", "B", "C", "D"],
    correctAnswer: "B",
    explanation: "The reviewed reason is B.",
    diagramUrl: null,
    diagramAlt: null,
  });
  it("catalogues all eligible global junior-school subjects with real pool sizes", async () => {
    const { model } = setup();
    const questionBank = {
      findMany: jest
        .fn()
        .mockResolvedValue([
          bankRow(1, "English"),
          bankRow(2, "Kiswahili"),
          bankRow(3, "Integrated Science"),
        ]),
    };
    const service = new KjseaService({
      kjseaMockAttempt: model,
      questionBank,
    } as any);
    const subjects = await service.subjects(actor);
    expect(subjects.map((s) => s.subject)).toEqual([
      "Mathematics",
      "English",
      "Integrated Science",
      "Kiswahili",
    ]);
    expect(questionBank.findMany.mock.calls[0][0].where).toMatchObject({
      isGlobal: true,
      source: "PLATFORM",
      schoolId: null,
      status: "APPROVED",
      questionType: "MULTIPLE_CHOICE",
    });
    expect(subjects.find((s) => s.subject === "English")?.questionCount).toBe(
      1,
    );
  });
  it("snapshots an approved subject without relabelling senior or other-subject content", async () => {
    const { model } = setup();
    const questionBank = {
      findMany: jest
        .fn()
        .mockResolvedValue([bankRow(1, "English"), bankRow(2, "Kiswahili")]),
    };
    const service = new KjseaService({
      kjseaMockAttempt: model,
      questionBank,
    } as any);
    const paper = await service.create(
      { source: "BANK", subject: "English" },
      actor,
    );
    expect(paper.subject).toBe("English");
    expect(paper.questions).toHaveLength(1);
    expect(paper.questions[0]).not.toHaveProperty("correctIndex");
    expect(paper.questions[0].sourceGrade).toBe("Grade 9");
    expect(paper.coverage).toMatchObject({ questionCount: 1, topicCount: 1 });
  });
  it("does not silently generate a mathematics paper for another subject", async () => {
    const { service } = setup();
    await expect(
      service.create({ source: "GENERATED", subject: "English" }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("Single-grade paper boundaries", () => {
  const item = (id: number, grade: string) => ({
    id,
    grade,
    subject: "English",
    topic: "Grammar",
    questionType: "MULTIPLE_CHOICE",
    questionText: `Choose the correct word ${id}`,
    options: ["one", "two", "three", "four"],
    correctAnswer: "two",
    explanation: "Two is correct for this example.",
  });
  it("defaults to the student grade and excludes other grades from discovery and generation", async () => {
    const { model } = setup();
    const bank = {
      findMany: jest
        .fn()
        .mockResolvedValue([
          item(1, "Grade 7"),
          item(2, "Grade 8"),
          item(3, "Grade 9"),
        ]),
    };
    const service = new KjseaService({
      kjseaMockAttempt: model,
      questionBank: bank,
    } as any);
    const student = { ...actor, grade: "Grade 7" };
    const subjects = await service.subjects(student);
    expect(subjects.find((s) => s.subject === "English")?.availableCount).toBe(
      1,
    );
    expect(bank.findMany.mock.calls[0][0].where.grade.in).toEqual([
      "Grade 7",
      "Grade7",
      "7",
    ]);
    const paper = await service.create(
      { source: "BANK", subject: "English" },
      student,
    );
    expect(paper.questions.map((q) => q.sourceGrade)).toEqual(["Grade 7"]);
    expect(paper.coverage).toMatchObject({
      grade: "Grade 7",
      grades: ["Grade 7"],
    });
  });
  it("honours an explicitly selected grade and rejects unsupported grade queries", async () => {
    const { service } = setup();
    const paper = await service.create(
      { grade: "Grade 8" },
      { ...actor, grade: "Grade 7" },
    );
    expect(paper.coverage).toMatchObject({
      grade: "Grade 8",
      grades: ["Grade 8"],
    });
    expect(paper.questions.every((q) => q.sourceGrade === "Grade 8")).toBe(
      true,
    );
    await expect(service.subjects(actor, "Grade 12")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.subjects(actor, "invalid")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
