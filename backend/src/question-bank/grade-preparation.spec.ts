import { createHash } from "crypto";
import { CollectionService } from "./collection.service";
import { GitHubCurriculumService } from "./github-curriculum.service";
import { ContentLibraryService } from "./content-library.service";
import manifest from "./github-curriculum.manifest.json";
const file = manifest.files.find((f) => f.grade === "Grade 7")!;
const actor = { id: 42, role: "PLATFORM_ADMIN" } as any;
const quote = "Compare two quantities using measurements.";
const u = {
  strand: "Measurements",
  subStrand: "1.1 Comparing quantities",
  outcome: quote,
  quote,
};
function fixture(valid = true) {
  let asset: any = {
    id: "asset",
    origin: file.sourceUrl,
    collection: { grades: ["Grade 7"] },
    extractedText: quote,
    mapping: {
      role: "CURRICULUM",
      subjects: [
        {
          grade: "Grade 7",
          subject: file.subject,
          pathway: "",
          evidence: quote,
          units: [u],
        },
      ],
      note: "",
      _source: {
        commit: manifest.commit,
        coverage: { warnings: ["Source is partial"] },
      },
    },
  };
  const prisma: any = {
    collectionAsset: {
      findFirst: jest.fn().mockImplementation(async () => asset),
      findUnique: jest.fn().mockImplementation(async () => asset),
      update: jest.fn().mockImplementation(async ({ data }) => {
        asset = { ...asset, ...data };
        return asset;
      }),
    },
    curriculumScope: {
      findUnique: jest.fn().mockResolvedValue({ id: 10 }),
      update: jest.fn(),
    },
    curriculumOutcome: {
      findMany: jest.fn().mockResolvedValue([
        { ...u, id: 7, sourceDocumentId: 1, supportingSourceIds: [] },
        {
          ...u,
          id: 8,
          sourceDocumentId: 1,
          quote: "An unsupported quotation.",
          supportingSourceIds: [],
        },
        {
          ...u,
          id: 9,
          outcome: "Unrelated source topic.",
          sourceDocumentId: 1,
          supportingSourceIds: [],
        },
      ]),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    questionBankSourceDocument: {
      findMany: jest.fn().mockImplementation(async ({ where }) =>
        where.role === "TEACHING"
          ? []
          : [
              {
                id: 1,
                chunks: [{ content: valid ? quote : "No relevant quotation." }],
              },
            ],
      ),
    },
    contentLibraryJob: { update: jest.fn() },
    curriculumGradeReview: { upsert: jest.fn() },
  };
  const github = {
    designsForGrade: jest.fn().mockReturnValue([file]),
    stage: jest.fn().mockResolvedValue({}),
  };
  const service = new CollectionService(
    prisma,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    github as any,
  );
  jest
    .spyOn(service as any, "indexAsset")
    .mockResolvedValue({ sourceIds: [1] });
  return { service, prisma, github };
}
describe("Automatic grade preparation", () => {
  it("validates only matching quoted outcomes and preserves partial-source limits without certifying grade inventory", async () => {
    const { service, prisma } = fixture();
    const r = await service.process(
      {
        id: "job",
        kind: "PREPARE_GRADE",
        input: {
          grade: "Grade 7",
          commit: manifest.commit,
          acceptSourceLimitations: true,
        },
      },
      actor,
    );
    expect(r.readyUnitIds).toEqual([7]);
    expect(r.inventoryComplete).toBe(false);
    expect(r.subjects[0].sourceGaps).toBe(1);
    expect(prisma.curriculumOutcome.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [7] } },
      data: { verified: true },
    });
    expect(prisma.curriculumGradeReview.upsert).not.toHaveBeenCalled();
    expect(
      prisma.collectionAsset.update.mock.calls[0][0].data.mapping._source,
    ).toMatchObject({
      limitationsReviewed: true,
      validationMode: "PINNED_SOURCE_AUTOMATED",
      batchAcceptedBy: 42,
    });
  });
  it("validates matching source hashes even when stored text chunks split a word", async () => {
    const { service, prisma } = fixture();
    prisma.questionBankSourceDocument.findMany.mockImplementation(
      async ({ where }: any) =>
        where.role === "TEACHING"
          ? []
          : [
              {
                id: 1,
                contentHash: createHash("sha256").update(quote).digest("hex"),
                chunks: [
                  { content: "Compare two quant" },
                  { content: "ities using measurements." },
                ],
              },
            ],
    );
    const result = await service.process(
      {
        id: "job",
        kind: "PREPARE_GRADE",
        input: {
          grade: "Grade 7",
          commit: manifest.commit,
          acceptSourceLimitations: true,
        },
      },
      actor,
    );
    expect(result.readyUnitIds).toEqual([7]);
  });
  it("does not mark invalid quotations ready and retains failure progress for inspection", async () => {
    const { service, prisma } = fixture(false);
    await expect(
      service.process(
        {
          id: "job",
          kind: "PREPARE_GRADE",
          input: {
            grade: "Grade 7",
            commit: manifest.commit,
            acceptSourceLimitations: true,
          },
        },
        actor,
      ),
    ).rejects.toThrow("No subjects");
    expect(prisma.curriculumOutcome.updateMany).not.toHaveBeenCalled();
    expect(
      prisma.contentLibraryJob.update.mock.calls[0][0].data.result.failures,
    ).toHaveLength(1);
  });
  it("keeps valid subjects ready while reporting another source failure", async () => {
    const { service, prisma, github } = fixture();
    github.designsForGrade.mockReturnValue([
      file,
      { ...file, id: "other", subject: "English" },
    ]);
    github.stage
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(Error("Source checksum mismatch"));
    const result = await service.process(
      {
        id: "job",
        kind: "PREPARE_GRADE",
        input: {
          grade: "Grade 7",
          commit: manifest.commit,
          acceptSourceLimitations: true,
        },
      },
      actor,
    );
    expect(result.readyUnitIds).toEqual([7]);
    expect(result.failures).toEqual([
      { subject: "English", error: "Source checksum mismatch" },
    ]);
    expect(result.inventoryComplete).toBe(false);
  });
  it("rejects unauthorised or stale preparation jobs before indexing", async () => {
    const { service, github } = fixture();
    await expect(
      service.process(
        {
          id: "job",
          kind: "PREPARE_GRADE",
          input: {
            grade: "Grade 7",
            commit: "old",
            acceptSourceLimitations: true,
          },
        },
        actor,
      ),
    ).rejects.toThrow("authorised snapshot");
    expect(github.stage).not.toHaveBeenCalled();
  });
  it("queues one grade job, pauses only queued alternatives and resumes an active preparation", async () => {
    const tx: any = {
      $executeRaw: jest.fn(),
      contentLibraryJob: {
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn(),
      },
      collectionAsset: {
        findMany: jest.fn().mockResolvedValue([
          { id: "git", origin: file.sourceUrl, status: "QUEUED" },
          {
            id: "drive",
            origin: "https://drive.google.com/uc?id=public123456",
            status: "QUEUED",
          },
        ]),
        updateMany: jest.fn(),
      },
    };
    const p = { $transaction: jest.fn().mockImplementation((f) => f(tx)) };
    const s = new GitHubCurriculumService(p as any);
    jest
      .spyOn(s, "importDesigns")
      .mockResolvedValue({ queued: 0, skipped: 16, collectionId: "c" });
    const dto = {
      grade: "Grade 7",
      commit: manifest.commit,
      rightsConfirmed: true,
      acceptSourceLimitations: true,
    } as const;
    const r = await s.prepareGrade(dto, actor);
    expect(r.pausedDownloads).toBe(1);
    expect(r.resumed).toBe(false);
    for (const call of tx.contentLibraryJob.updateMany.mock.calls)
      expect(call[0].where.status).toBe("QUEUED");
    expect(tx.contentLibraryJob.create.mock.calls[0][0].data).toMatchObject({
      kind: "PREPARE_GRADE",
      input: { grade: "Grade 7", acceptSourceLimitations: true },
    });
    tx.contentLibraryJob.findFirst.mockResolvedValue({ id: r.id });
    expect(await s.prepareGrade(dto, actor)).toMatchObject({
      id: r.id,
      resumed: true,
    });
    expect(tx.contentLibraryJob.create).toHaveBeenCalledTimes(1);
  });
  it("allows generation from explicitly prepared outcomes while leaving unprepared incomplete inventories blocked", async () => {
    const p: any = {
      curriculumOutcome: {
        findUnique: jest.fn().mockResolvedValue({
          ...u,
          id: 7,
          sourceDocumentId: 1,
          supportingSourceIds: [],
          verified: true,
          scope: { verified: true, grade: "Grade 7", subject: file.subject },
        }),
      },
      curriculumGradeReview: { findUnique: jest.fn().mockResolvedValue(null) },
      contentLibraryJob: {
        findFirst: jest.fn().mockResolvedValue({ id: "preparation" }),
        create: jest.fn().mockImplementation(async (v) => v),
      },
      questionBankSourceDocument: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, role: "CURRICULUM" }]),
      },
      $transaction: jest
        .fn()
        .mockImplementation((values) => Promise.all(values)),
    };
    const s = new CollectionService(
      p,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    await s.generate({ unitIds: [7], kind: "QUESTIONS", count: 5 }, actor);
    expect(
      p.contentLibraryJob.findFirst.mock.calls[0][0].where.AND,
    ).toContainEqual({
      result: { path: ["readyUnitIds"], array_contains: [7] },
    });
    p.contentLibraryJob.findFirst.mockResolvedValue(null);
    await expect(
      s.generate({ unitIds: [7], kind: "QUESTIONS", count: 5 }, actor),
    ).rejects.toThrow("expected subject list");
  });
  it("prioritises a grade preparation job over the older download backlog", async () => {
    const job = {
      id: "prep",
      kind: "PREPARE_GRADE",
      createdById: 42,
      input: { grade: "Grade 7" },
    };
    const p: any = {
      contentLibraryJob: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue(job),
        update: jest.fn(),
      },
      user: { findUnique: jest.fn().mockResolvedValue(actor) },
    };
    const collections = {
      process: jest.fn().mockResolvedValue({ readyUnitIds: [7] }),
    };
    await new ContentLibraryService(
      p,
      {} as any,
      {} as any,
      {} as any,
      collections as any,
    ).work();
    expect(p.contentLibraryJob.findFirst.mock.calls[0][0].where).toMatchObject({
      kind: "PREPARE_GRADE",
      status: "QUEUED",
    });
    expect(collections.process).toHaveBeenCalledWith(job, actor);
  });
});
