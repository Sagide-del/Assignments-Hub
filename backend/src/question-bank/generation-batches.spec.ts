import { QuestionBankService } from "./question-bank.service";
const actor = { id: 42, role: "PLATFORM_ADMIN" } as any;
const service = (p: any) =>
  new QuestionBankService(
    p,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );
describe("Durable numbered generation batches", () => {
  it("keeps all chunks and retries in one numbered run, then numbers the next run separately", async () => {
    const rows: any[] = [];
    const tx: any = {
      $executeRaw: jest.fn(),
      questionGenerationBatch: {
        findUnique: jest.fn(async ({ where }) =>
          rows.find((b) => b.key === where.key),
        ),
        create: jest.fn(async ({ data }) => {
          const row = { id: rows.length + 1, createdAt: new Date(), ...data };
          rows.push(row);
          return row;
        }),
      },
    };
    const p = { $transaction: jest.fn(async (fn) => fn(tx)) };
    const s = service(p) as any;
    const first = await s.generationBatch("job-one:0");
    expect(await s.generationBatch("job-one:15")).toEqual(first);
    expect(await s.generationBatch("job-one:0")).toEqual(first);
    expect(await s.generationBatch("job-two:0")).toMatchObject({
      id: 2,
      key: "job-two",
    });
    expect(first).toMatchObject({ id: 1, key: "job-one" });
    expect(first.createdAt).toBeInstanceOf(Date);
    expect(tx.questionGenerationBatch.create).toHaveBeenCalledTimes(2);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(4);
  });
  it("reads the saved catalogue newest first with permanent numbers/dates and protects admin access", async () => {
    const createdAt = new Date("2026-10-29T12:00:00Z");
    const p = {
      questionGenerationBatch: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 2, createdAt, _count: { questions: 30 } }]),
      },
    };
    const s = service(p);
    expect(await s.listBatches(actor)).toEqual([
      { id: 2, createdAt, count: 30 },
    ]);
    expect(p.questionGenerationBatch.findMany.mock.calls[0][0]).toMatchObject({
      orderBy: { id: "desc" },
      where: { questions: { some: { isGlobal: true } } },
    });
    await expect(
      s.listBatches({ ...actor, role: "STUDENT" }),
    ).rejects.toThrow();
  });
});
