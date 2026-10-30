import { readFile } from "fs/promises";
import { ContentCapabilitiesController } from "./content-capabilities.controller";
import manifest from "./github-curriculum.manifest.json";
jest.mock("fs/promises", () => ({ readFile: jest.fn() }));
describe("Saved-library deployment readiness", () => {
  const fixture = () => {
    (readFile as jest.Mock).mockResolvedValue(
      JSON.stringify({ commit: manifest.commit, files: manifest.files }),
    );
    const p: any = {
      contentLibraryJob: { count: jest.fn() },
      mnemonicCard: { findFirst: jest.fn() },
      questionGenerationBatch: { count: jest.fn() },
      questionBank: { findFirst: jest.fn() },
      curriculumScope: { count: jest.fn() },
      collectionAsset: { count: jest.fn() },
    };
    return { p, controller: new ContentCapabilitiesController(p) };
  };
  it("advertises library/publication readiness only after numbered-batch storage can be read", async () => {
    const f = fixture();
    expect(await f.controller.capabilities()).toMatchObject({
      savedQuestionLibrary: true,
      questionPublication: true,
      numberedQuestionBatches: true,
    });
    expect(f.p.questionGenerationBatch.count).toHaveBeenCalled();
    expect(f.p.questionBank.findFirst).toHaveBeenCalledWith({
      select: { batchId: true },
    });
  });
  it("blocks frontend rollout if the batch migration is missing", async () => {
    const f = fixture();
    f.p.questionGenerationBatch.count.mockRejectedValue(
      Error("relation does not exist"),
    );
    await expect(f.controller.capabilities()).rejects.toMatchObject({
      status: 503,
    });
  });
});
