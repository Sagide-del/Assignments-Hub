import type { QuestionBank } from "@prisma/client";
import {
  migrationGroups,
  legacyPayload,
  migrateQuestionBank,
  LEGACY_THEORY,
} from "../scripts/migrate-question-bank";
const row = (id: number, extra: Partial<QuestionBank> = {}) =>
  ({
    id,
    grade: "Grade 7",
    subject: "Integrated Science",
    topic: "Cells",
    source: "PLATFORM",
    isGlobal: true,
    schoolId: null,
    questionText: `Question ${id}`,
    options: { left: ["a"], right: ["b"] },
    config: { rubric: "retain" },
    correctAnswer: null,
    explanation: null,
    status: "APPROVED",
    questionType: "MATCHING",
    batchId: 2,
    ...extra,
  }) as QuestionBank;
describe("Lossless legacy bank migration", () => {
  it("groups normalized grades while separating subjects, topics and tenant-owned data", () => {
    const groups = migrationGroups([
      row(1),
      row(2, { grade: "7" }),
      row(3, { topic: "Plants" }),
      row(4, { grade: "Grade 8" }),
      row(5, { schoolId: 2, source: "SCHOOL", isGlobal: false }),
    ]);
    expect(groups.map((group) => group.rows.length)).toEqual([2, 1, 1, 1]);
    expect(groups[0].id).toBe(migrationGroups([row(2)])[0].id);
    expect(groups[3].tenant).toBe("2");
  });
  it("retains partial and over-30 sets, null answers and all legacy grading/batch metadata", () => {
    for (const count of [10, 35]) {
      const source = Array.from({ length: count }, (_, i) => row(i + 1));
      const payload = legacyPayload(source);
      expect(payload.questions).toHaveLength(count);
      expect(payload.questions[0].correct_answer).toBeNull();
      expect(payload.questions[0].options).toEqual([]);
      expect(payload.legacy_records).toEqual(source);
      expect(payload.theory_text).toBe(LEGACY_THEORY);
    }
  });
  it("rejects unclassifiable records and ambiguous school scope rather than losing them", () => {
    expect(() => migrationGroups([row(1, { grade: "Form One" })])).toThrow(
      "invalid grade",
    );
    expect(() => migrationGroups([row(1, { isGlobal: false })])).toThrow(
      "school scope",
    );
  });
  function db(existing: unknown = null) {
    const tx = {
      $executeRawUnsafe: jest.fn(),
      questionBank: { findMany: jest.fn().mockResolvedValue([row(1)]) },
      masterModule: {
        findUnique: jest.fn().mockResolvedValue(existing),
        create: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (value: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    return { tx, prisma };
  }
  it("defaults to a read-only dry run and reports plans without writing", async () => {
    const { tx, prisma } = db();
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    try {
      expect(await migrateQuestionBank(prisma as any)).toMatchObject({
        modules: 1,
        questions: 1,
      });
      expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
        "SET TRANSACTION READ ONLY",
      );
      expect(tx.masterModule.create).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });
  it("skips existing snapshots but refuses to overwrite changed or enriched histories", async () => {
    const payload = legacyPayload([row(1)]);
    // PostgreSQL JSONB may reorder object keys; reruns still compare structurally.
    const existing = {
      content_json: {
        legacy_records: payload.legacy_records,
        source: "LEGACY",
        questions: [],
      },
    };
    const { tx, prisma } = db(existing);
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    try {
      expect(await migrateQuestionBank(prisma as any)).toMatchObject({
        modules: 0,
        skipped: 1,
      });
      expect(tx.masterModule.create).not.toHaveBeenCalled();
      tx.masterModule.findUnique.mockResolvedValue({
        content_json: { source: "LEGACY", legacy_records: [] },
      });
      await expect(migrateQuestionBank(prisma as any)).rejects.toThrow(
        "Refusing to overwrite",
      );
    } finally {
      log.mockRestore();
    }
  });
});
