import { CmsService } from "./cms.service";
const additions = (count: number) => ({
  theory_text: Array(300).fill("waves").join(" "),
  equations: [],
  illustration_prompt: "Wave diagram",
  questions: Array.from({ length: count }, (_, i) => ({
    question_text: `New question ${i}`,
    options: ["a", "b", "c", "d"],
    correct_answer: "a",
    explanation: "Reason",
  })),
});
function setup(count = 15, status = "APPROVED") {
  const original = Array.from({ length: count }, (_, i) => ({
    question_text: `Old question ${i}`,
    options: [],
    correct_answer: null,
    explanation: "",
    legacy_question_id: i,
  }));
  const module = {
    id: "module",
    grade: 10,
    subject: "Physics",
    topic: "Waves",
    status: status === "APPROVED_PUBLISHED" ? "APPROVED" : status,
    distributions:
      status === "APPROVED_PUBLISHED" ? [{ audience: "PUBLIC_STORE" }] : [],
    updated_at: new Date(),
    generation_cost_tokens: 10,
    content_json: {
      source: "LEGACY",
      legacy_records: [{ id: 1, config: { retain: true } }],
      questions: original,
    },
  };
  const tx = {
    masterModule: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest
        .fn()
        .mockResolvedValue({ ...module, status: "DRAFT" }),
    },
  };
  const prisma = {
    masterModule: { findUnique: jest.fn().mockResolvedValue(module) },
    $transaction: jest.fn((callback) => callback(tx)),
  };
  const ai = {
    generateAssignment: jest.fn().mockResolvedValue({
      content: additions(Math.max(0, 30 - count)),
      usage: { totalTokens: 42 },
    }),
  };
  return {
    service: new CmsService(prisma as any, ai as any),
    prisma,
    tx,
    ai,
    module,
    original,
  };
}
describe("CMS enrichment", () => {
  it("generates only the missing questions and preserves originals, snapshots and token usage", async () => {
    const { service, ai, tx, original } = setup();
    await service.enrichModule("module");
    expect(ai.generateAssignment.mock.calls[0][0]).toContain(
      "exactly 15 ADDITIONAL",
    );
    const data = tx.masterModule.updateMany.mock.calls[0][0].data;
    expect(data.status).toBe("DRAFT");
    expect(data.content_json.questions).toHaveLength(30);
    expect(data.content_json.questions.slice(0, 15)).toEqual(original);
    expect(data.content_json.legacy_records).toEqual([
      { id: 1, config: { retain: true } },
    ]);
    expect(data.generation_cost_tokens).toEqual({ increment: 42 });
  });
  it("never truncates sets larger than 30 and requests no additional questions", async () => {
    const { service, ai, tx, original } = setup(35);
    await service.enrichModule("module");
    expect(ai.generateAssignment.mock.calls[0][0]).toContain(
      "exactly 0 ADDITIONAL",
    );
    expect(
      tx.masterModule.updateMany.mock.calls[0][0].data.content_json.questions,
    ).toEqual(original);
  });
  it("rejects published content before spending credit", async () => {
    const { service, ai } = setup(15, "APPROVED_PUBLISHED");
    await expect(service.enrichModule("module")).rejects.toThrow(
      "Only unpublished",
    );
    expect(ai.generateAssignment).not.toHaveBeenCalled();
  });
  it("rejects malformed or duplicate new questions without modifying the original", async () => {
    const { service, ai, tx } = setup();
    const result = additions(15);
    result.questions[0].question_text = "Old question 1";
    ai.generateAssignment.mockResolvedValueOnce({
      content: result,
      usage: { totalTokens: 42 },
    });
    await expect(service.enrichModule("module")).rejects.toThrow(
      "AI Generation failed",
    );
    expect(tx.masterModule.updateMany).not.toHaveBeenCalled();
    ai.generateAssignment.mockResolvedValueOnce({
      content: additions(14),
      usage: { totalTokens: 42 },
    });
    await expect(service.enrichModule("module")).rejects.toThrow(
      "AI Generation failed",
    );
  });
  it("detects concurrent edits instead of overwriting publication or approval", async () => {
    const { service, tx, module } = setup();
    tx.masterModule.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.enrichModule("module")).rejects.toThrow(
      "changed during generation",
    );
    expect(tx.masterModule.updateMany.mock.calls[0][0].where).toMatchObject({
      status: "APPROVED",
      updated_at: module.updated_at,
    });
  });
});
