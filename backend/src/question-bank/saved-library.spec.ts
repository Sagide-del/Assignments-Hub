import { QuestionBankService } from "./question-bank.service";
const actor = { id: 42, role: "PLATFORM_ADMIN" } as any;
const row = (
  grade: string,
  subject: string,
  batchId: number,
  status: string,
  count: number,
) => ({ grade, subject, batchId, status, _count: { _all: count } });
function fixture() {
  const groups = [
    row("Grade 7", "Mathematics", 1, "APPROVED", 10),
    row("7", "Mathematics", 1, "GENERATED", 3),
    row("Grade 7", "English", 2, "APPROVED", 2),
    row("Grade 10", "English", 3, "GENERATED", 20),
    row("Grade12", "Biology", 4, "APPROVED", 4),
  ];
  const tx: any = {
    questionBank: {
      groupBy: jest.fn(async ({ by }) =>
        by.includes("status")
          ? groups
          : [row("Grade 7", "Mathematics", 1, "APPROVED", 5)],
      ),
    },
    questionGenerationBatch: {
      findMany: jest
        .fn()
        .mockResolvedValue(
          [1, 2, 3, 4].map((id) => ({
            id,
            createdAt: new Date(`2026-10-${20 + id}T12:00:00Z`),
          })),
        ),
    },
  };
  const p: any = { $transaction: jest.fn(async (fn) => fn(tx)) };
  return {
    groups,
    tx,
    p,
    service: new QuestionBankService(
      p,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    ),
  };
}
describe("Saved grade/subject/batch library", () => {
  it("retains original batch dates and separates all supported grade collections and their subjects", async () => {
    const f = fixture();
    const library = await f.service.savedLibrary(actor);
    expect(library.map((g) => g.grade)).toEqual(
      [6, 7, 8, 9, 10, 11, 12].map((n) => `Grade ${n}`),
    );
    expect(library[1]).toMatchObject({
      total: 15,
      approved: 12,
      drafts: 3,
      published: 5,
    });
    expect(library[1].batches.map((b) => b.batchId)).toEqual([2, 1]);
    expect(library[1].batches[1]).toMatchObject({
      batchId: 1,
      subject: "Mathematics",
      total: 13,
      approved: 10,
      drafts: 3,
      published: 5,
      createdAt: new Date("2026-10-21T12:00:00Z"),
    });
    expect(library[4]).toMatchObject({
      grade: "Grade 10",
      total: 20,
      approved: 0,
    });
    expect(library[6]).toMatchObject({ grade: "Grade 12", total: 4 });
    expect(library[2]).toMatchObject({
      grade: "Grade 8",
      total: 0,
      batches: [],
    });
  });
  it("adding another grade or generation batch never replaces earlier saved content", async () => {
    const f = fixture();
    const before = (await f.service.savedLibrary(actor))[1];
    f.groups.push(row("Grade 11", "Physics", 5, "GENERATED", 30));
    f.groups.push(row("Grade 7", "Mathematics", 6, "GENERATED", 30));
    const after = await f.service.savedLibrary(actor);
    expect(after[1].batches.find((b) => b.batchId === 1)).toEqual(
      before.batches.find((b) => b.batchId === 1),
    );
    expect(after[1].total).toBe(45);
    expect(after[5].total).toBe(30);
    expect(f.tx.questionBank.groupBy.mock.calls[0][0].where).toEqual({
      isGlobal: true,
    });
    const publicationQuery = f.tx.questionBank.groupBy.mock.calls[1][0].where;
    expect(publicationQuery.OR[1].usages.some.assignment).toMatchObject({
      isPublished: true,
      createdBy: { role: "PLATFORM_ADMIN" },
    });
    expect(JSON.stringify(after)).not.toContain("correctAnswer");
  });
  it("rejects non-admin callers before accessing the shared repository", async () => {
    const f = fixture();
    await expect(
      f.service.savedLibrary({ ...actor, role: "STUDENT" }),
    ).rejects.toThrow();
    expect(f.p.$transaction).not.toHaveBeenCalled();
  });
});
