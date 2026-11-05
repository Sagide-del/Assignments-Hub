import { BadRequestException, ConflictException } from "@nestjs/common";
import {
  PublicRevisionService,
  publicTopic,
  revisionFingerprint,
  selectPublicQuestions,
} from "./public-revision.service";
const questions = Array.from({ length: 30 }, (_, i) => ({
  question_text: `Question ${i + 1}`,
  options: ["One", "Two", "Three", "Four"],
  correct_answer: "One",
  explanation:
    "One is correct because it satisfies the condition in the question.",
  private_source: "Do not leak",
  verified_answer: "secret",
}));
const moduleRow = () => ({
  id: "abc",
  grade: 10,
  subject: "Mathematics",
  topic: "Algebra",
  status: "APPROVED",
  tenant_id: null,
  content_json: { questions, private_notes: "secret" },
});
const dto = {
  question_indices: [0, 1, 2],
  introduction:
    "A substantive introduction that helps students understand the mathematical ideas they will practise, and how to approach these questions independently.",
  guidance: [
    "Explain your method aloud before checking the answer.",
    "Return to the topic tomorrow and test yourself again.",
  ],
  rights_confirmed: true,
};
describe("Explicit public revision samples", () => {
  it("whitelists selected questions, never copies grading or private source data", () => {
    const q = selectPublicQuestions(questions, [0, 1, 2]);
    expect(q).toHaveLength(3);
    expect(Object.keys(q[0])).toEqual([
      "prompt",
      "options",
      "answer",
      "explanation",
    ]);
    expect(JSON.stringify(q)).not.toContain("secret");
  });
  it("rejects raw HTML, diagram-dependent and incomplete samples", () => {
    expect(() => selectPublicQuestions(questions, [0])).toThrow(
      BadRequestException,
    );
    expect(() =>
      selectPublicQuestions(
        [
          { ...questions[0], illustration: { url: "http://private" } },
          ...questions,
        ],
        [0, 1, 2],
      ),
    ).toThrow();
    expect(() =>
      selectPublicQuestions(
        [
          { ...questions[0], question_text: "<script>bad</script>" },
          ...questions,
        ],
        [0, 1, 2],
      ),
    ).toThrow();
  });
  it("requires explicit approval and immediately excludes changed, archived and school-owned sources", () => {
    const m: any = moduleRow();
    expect(publicTopic(m)).toBeNull();
    m.content_json.public_revision = {
      version: 1,
      fingerprint: revisionFingerprint(m),
      introduction: dto.introduction,
      guidance: dto.guidance,
      questions: selectPublicQuestions(questions, [0, 1, 2]),
    };
    expect(publicTopic(m)?.questions).toHaveLength(3);
    expect(JSON.stringify(publicTopic(m))).not.toContain("private_notes");
    expect(publicTopic({ ...m, status: "ARCHIVED" })).toBeNull();
    expect(publicTopic({ ...m, tenant_id: "school" })).toBeNull();
    expect(publicTopic({ ...m, topic: "Changed" })).toBeNull();
  });
  it("saves a frozen snapshot without removing bank content or distributions", async () => {
    const m = moduleRow();
    const db: any = {
      masterModule: {
        findUnique: jest.fn().mockResolvedValue(m),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    await new PublicRevisionService(db).publish("abc", dto, 7);
    const saved = db.masterModule.updateMany.mock.calls[0][0].data.content_json;
    expect(saved.questions).toHaveLength(30);
    expect(saved.public_revision.questions).toHaveLength(3);
    expect(saved.public_revision.reviewed_by).toBe(7);
    expect(saved.private_notes).toBe("secret");
    expect(
      db.masterModule.updateMany.mock.calls[0][0].where.content_json.equals,
    ).toEqual(m.content_json);
  });
  it("blocks school sources, missing consent, concurrent changes and invalid indices", async () => {
    const db: any = {
      masterModule: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ ...moduleRow(), tenant_id: "school" }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const service = new PublicRevisionService(db);
    await expect(service.publish("abc", dto, 1)).rejects.toThrow();
    db.masterModule.findUnique.mockResolvedValue(moduleRow());
    await expect(
      service.publish("abc", { ...dto, rights_confirmed: false }, 1),
    ).rejects.toThrow();
    await expect(service.publish("abc", dto, 1)).rejects.toThrow(
      ConflictException,
    );
    expect(() => selectPublicQuestions(questions, [0, 1, 99])).toThrow();
  });
  it("withdraws only the public snapshot", async () => {
    const m: any = moduleRow();
    m.content_json.public_revision = { version: 1 };
    const db: any = {
      masterModule: {
        findUnique: jest.fn().mockResolvedValue(m),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    await new PublicRevisionService(db).withdraw("abc");
    expect(
      db.masterModule.updateMany.mock.calls[0][0].data.content_json,
    ).toEqual({ questions, private_notes: "secret" });
  });
});
