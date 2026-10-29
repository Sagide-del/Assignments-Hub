import { QuestionBankService } from "./question-bank.service";
import { BulkApproveQuestionBankDto } from "./dto/bulk-approve-question-bank.dto";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
const actor = { id: 42, schoolId: 1, role: "PLATFORM_ADMIN" } as any;
const before = new Date(Date.now() - 1000).toISOString();
const item = (id: number, extra = {}) => ({
  id,
  status: "GENERATED",
  isGlobal: true,
  grade: "Grade 7",
  subject: "Mathematics",
  topic: "Fractions",
  questionText: "What is one half of ten?",
  questionType: "MULTIPLE_CHOICE",
  options: ["2", "3", "4", "5"],
  correctAnswer: "5",
  explanation: "Ten divided by two equals five.",
  diagramUrl: null,
  contentHtml: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...extra,
});
function setup(initial: any[]) {
  const data = initial.map((i) => ({ ...i }));
  const matches = (q: any, where: any): boolean => {
    if (where.AND && !where.AND.every((w: any) => matches(q, w))) return false;
    if (where.OR && !where.OR.some((w: any) => matches(q, w))) return false;
    for (const [key, value] of Object.entries(where)) {
      if (value === undefined || ["AND", "OR"].includes(key)) continue;
      const v = value as any;
      if (v instanceof Date) {
        if (+new Date(q[key]) !== +v) return false;
      } else if (typeof v !== "object") {
        if (q[key] !== v) return false;
      } else {
        if (v.in && !v.in.includes(q[key])) return false;
        if (v.notIn?.includes(q[key])) return false;
        if (v.gt !== undefined && q[key] <= v.gt) return false;
        if (v.lte !== undefined && +new Date(q[key]) > +v.lte) return false;
        if (
          v.equals !== undefined &&
          String(q[key]).toLowerCase() !== v.equals.toLowerCase()
        )
          return false;
        if (
          v.contains !== undefined &&
          !String(q[key]).toLowerCase().includes(v.contains.toLowerCase())
        )
          return false;
      }
    }
    return true;
  };
  const p: any = {
    questionBank: {
      findMany: jest.fn(async ({ where, take }) =>
        data
          .filter((q) => matches(q, where))
          .sort((a, b) => a.id - b.id)
          .slice(0, take),
      ),
      updateMany: jest.fn(async ({ where, data: changes }) => {
        const rows = data.filter((q) => matches(q, where));
        rows.forEach((q) => Object.assign(q, changes));
        return { count: rows.length };
      }),
    },
  };
  const audit = { record: jest.fn() };
  const service = new QuestionBankService(
    p,
    {} as any,
    {} as any,
    audit as any,
    {} as any,
    {} as any,
  );
  return { p, data, audit, service };
}
describe("Bulk question approval", () => {
  it("approves only the selected generation batch", async () => {
    const f = setup([item(1, { batchId: 1 }), item(2, { batchId: 2 })]);
    expect(
      await f.service.bulkApprove(
        { scope: "FILTER", before, filters: { batchId: 2 } },
        actor,
      ),
    ).toMatchObject({ approved: 1 });
    expect(f.data.map((q) => q.status)).toEqual(["GENERATED", "APPROVED"]);
  });
  it("approves across pages while retaining the same completeness/visual validation", async () => {
    const { service, p, data, audit } = setup([
      ...Array.from({ length: 260 }, (_, i) => item(i + 1)),
      item(261, { correctAnswer: "not an option" }),
      item(262, { questionText: "Read the graph below." }),
      item(263, { explanation: "" }),
      item(264, { options: ["2", "3", "5", "5"] }),
      item(265, { grade: "Grade 8" }),
      item(266, { status: "REJECTED" }),
      item(267, { isGlobal: false }),
      item(268, { subject: "English" }),
      item(269, { createdAt: new Date(), updatedAt: new Date() }),
    ]);
    const result = await service.bulkApprove(
      {
        scope: "FILTER",
        before,
        filters: { grade: "grade 7", subject: "MATHEMATICS", topic: "fract" },
      },
      actor,
    );
    expect(result).toMatchObject({
      approved: 260,
      invalid: 4,
      changed: 0,
      examined: 264,
    });
    expect(result.issues.map((q) => q.id)).toEqual([261, 262, 263, 264]);
    expect(p.questionBank.updateMany).toHaveBeenCalledTimes(2);
    expect(data.filter((q) => q.status === "APPROVED")).toHaveLength(260);
    expect(data.find((q) => q.id === 261).status).toBe("GENERATED");
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ approved: 260, invalid: 4 }),
        userId: 42,
      }),
    );
  });
  it("approves only selected IDs, and filter-wide selection supports exclusions", async () => {
    const { service, data } = setup([item(1), item(2), item(3)]);
    expect(
      await service.bulkApprove({ scope: "IDS", ids: [2] }, actor),
    ).toMatchObject({ approved: 1 });
    expect(data[0].status).toBe("GENERATED");
    expect(
      await service.bulkApprove(
        { scope: "FILTER", before, filters: {}, excludedIds: [3] },
        actor,
      ),
    ).toMatchObject({ approved: 1 });
    expect(data[2].status).toBe("GENERATED");
  });
  it("does not approve a draft edited concurrently after validation", async () => {
    const { service, p, data } = setup([item(1)]);
    const original = p.questionBank.findMany.getMockImplementation();
    p.questionBank.findMany.mockImplementationOnce(async (args: any) => {
      const rows = await original(args);
      const snapshot = rows.map((q: any) => ({ ...q }));
      data[0].updatedAt = new Date();
      data[0].correctAnswer = "edited";
      return snapshot;
    });
    expect(
      await service.bulkApprove(
        { scope: "FILTER", before, filters: {} },
        actor,
      ),
    ).toMatchObject({ approved: 0, changed: 1 });
    expect(data[0].status).toBe("GENERATED");
  });
  it("does not approve previously edited drafts or drafts arriving after select-all", async () => {
    const { service } = setup([
      item(1),
      item(2, { updatedAt: new Date() }),
      item(3, { createdAt: new Date(), updatedAt: new Date() }),
    ]);
    expect(
      await service.bulkApprove(
        { scope: "FILTER", before, filters: {} },
        actor,
      ),
    ).toMatchObject({ approved: 1, examined: 1 });
  });
  it("requires platform-admin authority and explicit selection", async () => {
    const { service, p } = setup([item(1)]);
    await expect(
      service.bulkApprove(
        { scope: "IDS", ids: [1] },
        { ...actor, role: "TEACHER" },
      ),
    ).rejects.toThrow();
    await expect(
      service.bulkApprove({ scope: "IDS", ids: [] }, actor),
    ).rejects.toThrow("Select questions");
    await expect(
      service.bulkApprove({ scope: "FILTER" }, actor),
    ).rejects.toThrow("Select matching");
    expect(p.questionBank.updateMany).not.toHaveBeenCalled();
  });
  it("validates IDs, selection timestamps and nested filters", async () => {
    for (const body of [
      { scope: "IDS", ids: [] },
      { scope: "IDS", ids: [-1] },
      { scope: "FILTER", before: "bad", filters: {} },
      { scope: "FILTER", before, filters: { subject: 123 } },
      { scope: "IDS", ids: [1, 1] },
    ])
      expect(
        (await validate(plainToInstance(BulkApproveQuestionBankDto, body)))
          .length,
      ).toBeGreaterThan(0);
    expect(
      await validate(
        plainToInstance(BulkApproveQuestionBankDto, {
          scope: "FILTER",
          before,
          filters: { grade: "Grade 7" },
          excludedIds: [2],
        }),
      ),
    ).toEqual([]);
  });
});
