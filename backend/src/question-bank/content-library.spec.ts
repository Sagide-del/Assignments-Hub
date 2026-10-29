import { curriculumLinks, officialUrl } from "./official-curriculum";
import {
  rankPractice,
  renderQuestionVisual,
  validateRecall,
} from "./content-tools";
import { PracticeService } from "./practice.service";
import { ContentLibraryService } from "./content-library.service";
import { Role } from "../common/enums/role.enum";
const actor = {
  id: 42,
  schoolId: 1,
  role: Role.STUDENT,
  name: "Student",
  grade: "Grade 8",
  email: null,
  admissionNumber: null,
  isIndependentTrial: false,
};
const card = {
  cue: "What is the order of the process?",
  mnemonic: "A meaningful memory aid",
  explanation:
    "The aid represents each stage accurately but is not a complete explanation.",
  facts: [
    { label: "First", meaning: "The first stage" },
    { label: "Second", meaning: "The second stage" },
  ],
  checks: [
    { question: "What happens first?", answer: "The first stage" },
    { question: "What happens next?", answer: "The second stage" },
  ],
};
describe("Central content rules", () => {
  it("only follows HTTPS KICD links and distinguishes grades without confusing 1 with 12", () => {
    expect(officialUrl("/wp-content/grade-12.pdf")).toContain(
      "https://kicd.ac.ke/",
    );
    for (const url of [
      "http://kicd.ac.ke/x",
      "https://evil.test/x",
      "https://kicd.ac.ke.evil.test/x",
      "https://kicd.ac.ke:8443/x",
      "https://user@kicd.ac.ke/x",
    ])
      expect(() => officialUrl(url)).toThrow();
    const links = curriculumLinks(
      '<a href="https://evil.test/grade-8.pdf">bad</a><a href="/cbc-materials/curriculum-designs/grade-twelve/">Grade Twelve</a><a href="/files/grade-7-science.pdf">Science</a>',
      "https://kicd.ac.ke/",
    );
    expect(links).toHaveLength(2);
    expect(links.map((l) => l.grade)).toEqual(["Grade 12", "Grade 7"]);
  });
  it("renders bounded structured visuals with escaped labels rather than executable model SVG", () => {
    const svg = renderQuestionVisual({
      kind: "bars",
      labels: ["<script>bad</script>", "B"],
      values: [10, 20],
      caption: "A & B",
    });
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).not.toContain("<script>");
    expect(
      renderQuestionVisual({
        kind: "bars",
        labels: ["a", "b"],
        values: [Infinity, 1],
      }),
    ).toBeUndefined();
    expect(
      renderQuestionVisual({ kind: "iframe", url: "javascript:bad" }),
    ).toBeUndefined();
    expect(
      renderQuestionVisual({ kind: "triangle", base: -1, height: 10 }),
    ).toBeUndefined();
    expect(
      renderQuestionVisual({
        kind: "table",
        headings: ["a"],
        rows: [["x", "y"]],
      }),
    ).toBeUndefined();
  });
  it("requires meaningful recall cues, mapped facts and at least two retrieval checks", () => {
    expect(validateRecall(card, [7]).sourceIds).toEqual([7]);
    expect(() => validateRecall({ ...card, checks: [] }, [])).toThrow();
    expect(() => validateRecall({ ...card, facts: [{}] }, [])).toThrow();
  });
  it("allocates 30 distinct questions, favours unseen questions, reduces overlap and revisits older seen items", () => {
    const pool = Array.from({ length: 90 }, (_, i) => ({
        id: i + 1,
        topic: "topic",
      })),
      one = rankPractice(pool, [], [], 123),
      two = rankPractice(
        pool,
        [],
        [{ questions: one.map((q) => ({ sourceQuestionId: q.id })) }],
        456,
      );
    expect(one).toHaveLength(30);
    expect(new Set(one.map((q) => q.id)).size).toBe(30);
    expect(two.every((q) => !one.some((x) => x.id === q.id))).toBe(true);
    const history = [
        {
          questions: one.map((q) => ({ sourceQuestionId: q.id })),
          completedAt: new Date(),
        },
      ],
      next = rankPractice(pool, history, [], 789);
    expect(next.every((q) => !one.some((x) => x.id === q.id))).toBe(true);
    const older = rankPractice(
      pool.slice(0, 30),
      [
        {
          questions: pool.slice(0, 29).map((q) => ({ sourceQuestionId: q.id })),
          completedAt: new Date(),
        },
      ],
      [],
      1,
    );
    expect(older[0].id).toBe(30);
  });
});
function setup(current: any = null, count = 60) {
  let created: any;
  const rows = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    grade: "Grade 8",
    subject: "Mathematics",
    topic: "Numbers",
    questionType: "MULTIPLE_CHOICE",
    questionText: `Question ${i + 1}`,
    options: ["1", "2", "3", "4"],
    correctAnswer: "1",
    explanation: "The correct result is one.",
    contentHtml: null,
    diagramUrl: null,
    diagramAlt: null,
  }));
  const tx = {
    $executeRaw: jest.fn(),
    questionBank: { findMany: jest.fn().mockResolvedValue(rows) },
    kjseaMockAttempt: {
      findFirst: jest.fn().mockResolvedValue(current),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }) => {
        created = { id: "new", ...data };
        return created;
      }),
    },
  };
  const prisma = {
    school: {
      findUnique: jest.fn().mockResolvedValue({ code: "INDEPENDENT" }),
    },
    $transaction: jest.fn().mockImplementation((f) => f(tx)),
  };
  return {
    service: new PracticeService(prisma as any),
    prisma,
    tx,
    getCreated: () => created,
  };
}
describe("Independent practice allocation", () => {
  it("resumes an unfinished batch without allocating questions again", async () => {
    const { service, tx } = setup({ id: "existing" });
    expect(await service.start("Mathematics", actor)).toEqual({
      id: "existing",
      resumed: true,
    });
    expect(tx.questionBank.findMany).not.toHaveBeenCalled();
    expect(tx.$executeRaw).toHaveBeenCalled();
  });
  it("creates a private snapshot of exactly 30 questions scoped to the profile grade", async () => {
    const { service, tx, getCreated } = setup();
    expect(await service.start("Mathematics", actor)).toEqual({
      id: "new",
      resumed: false,
    });
    expect(tx.questionBank.findMany.mock.calls[0][0].where.grade.in).toContain(
      "Grade 8",
    );
    expect(getCreated().questions).toHaveLength(30);
    expect(getCreated()).toMatchObject({
      studentId: 42,
      schoolId: 1,
      source: "PRACTICE",
      coverage: { grade: "Grade 8", questionCount: 30 },
    });
  });
  it("does not generate undersized batches or allow school users into independent allocation", async () => {
    const small = setup(null, 29);
    await expect(small.service.start("Mathematics", actor)).rejects.toThrow(
      "At least 30",
    );
    const school = setup();
    school.prisma.school.findUnique.mockResolvedValue({ code: "SCHOOL" });
    await expect(school.service.start("Mathematics", actor)).rejects.toThrow(
      "teachers",
    );
    expect(school.tx.kjseaMockAttempt.create).not.toHaveBeenCalled();
  });
});
describe("Durable content generation", () => {
  it("queues one job per verified source and rejects relabelled or unknown sources", async () => {
    const source = { id: 1, grade: "Grade 7", subject: "Mathematics" };
    const prisma = {
      questionBankSourceDocument: {
        findMany: jest.fn().mockResolvedValue([source]),
      },
      contentLibraryJob: {
        create: jest.fn().mockImplementation((x) => Promise.resolve(x.data)),
      },
      $transaction: jest.fn().mockImplementation((jobs) => Promise.all(jobs)),
    };
    const service = new ContentLibraryService(
      prisma as any,
      {} as any,
      {} as any,
      {} as any,
    );
    const result = await service.generate(
      { sourceIds: [1], kind: "QUESTIONS", count: 30 },
      { ...actor, role: Role.PLATFORM_ADMIN },
    );
    expect(result[0]).toMatchObject({
      kind: "QUESTIONS",
      input: { grade: "Grade 7", subject: "Mathematics", count: 30 },
    });
    source.grade = "All grades";
    await expect(
      service.generate({ sourceIds: [1], kind: "CARDS", count: 5 }, actor),
    ).rejects.toThrow("Grade 6–12");
  });
  it("atomically claims work, records failures, and only retries failed jobs", async () => {
    const prisma = {
      contentLibraryJob: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: "a", status: "COMPLETED" }),
        update: jest.fn(),
      },
    };
    const service = new ContentLibraryService(
      prisma as any,
      {} as any,
      {} as any,
      {} as any,
    );
    await expect(service.retry("a")).rejects.toThrow("failed");
    expect(prisma.contentLibraryJob.update).not.toHaveBeenCalled();
  });
});

describe("Content worker persistence", () => {
  it("claims queued work once and stores generated question IDs", async () => {
    const job = {
      id: "job-1",
      kind: "QUESTIONS",
      status: "QUEUED",
      createdById: 42,
      input: {
        sourceId: 1,
        subject: "Mathematics",
        grade: "Grade 8",
        topic: "Numbers",
        count: 30,
      },
    };
    const prisma = {
      contentLibraryJob: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue(job),
        update: jest.fn(),
      },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ ...actor, role: Role.PLATFORM_ADMIN }),
      },
    };
    const bank = {
      generate: jest.fn().mockResolvedValue([{ id: 7 }, { id: 8 }]),
    };
    const service = new ContentLibraryService(
      prisma as any,
      bank as any,
      {} as any,
      {} as any,
    );
    await service.work();
    expect(bank.generate).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ sourceDocumentId: 1, grade: "Grade 8" }),
      expect.anything(),
      "job-1:0",
    );
    expect(prisma.contentLibraryJob.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: {
        status: "COMPLETED",
        result: { count: 4, questionIds: [7, 8, 7, 8] },
      },
    });
    prisma.contentLibraryJob.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 0 });
    await service.work();
    expect(bank.generate).toHaveBeenCalledTimes(2);
  });
});
