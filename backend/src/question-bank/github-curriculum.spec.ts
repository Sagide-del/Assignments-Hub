import { createHash } from "crypto";
import {
  parseRepositoryDesign,
  curriculumText,
  RepositoryDesign,
} from "./github-curriculum-parser";
import manifest from "./github-curriculum.manifest.json";
import { GitHubCurriculumService } from "./github-curriculum.service";
import { CollectionService } from "./collection.service";
const text = `**KENYA INSTITUTE OF CURRICULUM DEVELOPMENT**
**GRADE 7** **ENGLISH** Revised 2024
| Strand | Sub Strand | Lessons |
| Reading | 1.1.1 Reading for meaning 2.1.1 Poetry | 4 |
| Strand | Sub Strand | Specific Learning Outcomes | Suggested Learning Experiences | Key Inquiry |
| --- | --- | --- | --- | --- |
| **1.1 Reading** | **1.1.1 Reading for meaning** | By the end, the learner should be able to: a) infer meaning from contextual clues, b) explain an inference using evidence. | Read an original passage. | What supports your inference? |
| Criterion | Exceeding expectations | Meeting expectations | Approaching expectations | Below expectations |
| 1 | Excellent | Good | Developing | Beginning |
`;
const entry = (source = text): RepositoryDesign => ({
  id: "example",
  grade: "Grade 7",
  subject: "English",
  path: "Grade_7/English.md",
  sha256: createHash("sha256").update(source).digest("hex"),
  revision: "2024",
  sourceUrl: "https://github.com/example/design/blob/commit/Grade_7/English.md",
  officialDirectory:
    "https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-seven-designs/",
});
describe("Pinned KICD transcription integration", () => {
  it("extracts English outcomes with quotations and reports source-summary gaps without inventing missing content", () => {
    const r = parseRepositoryDesign(text, entry());
    expect(r.rows).toBe(1);
    expect(r.outcomes).toBe(2);
    expect(r.mapping.subjects[0].units[0]).toMatchObject({
      strand: "Reading",
      subStrand: "1.1.1 Reading for meaning",
      outcome: "infer meaning from contextual clues,",
    });
    expect(r.coverage.missingIds).toEqual(["2.1.1"]);
    expect(r.mapping.subjects[0].units.some((u) => u.outcome === "Good")).toBe(
      false,
    );
    for (const u of r.mapping.subjects[0].units)
      expect(r.text.replace(/\s+/g, " ")).toContain(u.quote);
  });
  it("rejects changed source bytes and a mismatched grade header", () => {
    expect(() => parseRepositoryDesign(text + "changed", entry())).toThrow(
      "checksum",
    );
    expect(() =>
      parseRepositoryDesign(text, { ...entry(), grade: "Grade 8" }),
    ).toThrow("header");
  });
  it("rejects a subject mapped to the wrong document title", () => {
    expect(() =>
      parseRepositoryDesign(text, { ...entry(), subject: "Mathematics" }),
    ).toThrow("subject");
  });
  it("preserves arithmetic, variable underscores and escaped table pipes", () => {
    expect(curriculumText("**Bold** 3*4 x_y a \\| b")).toBe(
      "Bold 3*4 x_y a | b",
    );
  });
  it("recognises Swahili outcomes and irregular sub-strand headers", () => {
    const source = `TAASISI YA UKUZAJI MITAALA KENYA GREDI YA SABA KISWAHILI
| Mada | Mada Ndogo | Matokeo Maalum Yanayotarajiwa | Shughuli | Maswali |
| --- | --- | --- | --- | --- |
| 1.1 Kusoma | 1.1.1 Ufahamu | Mwanafunzi aweze: a) kusoma kifungu kwa ufasaha, b) kueleza maana ya kifungu. | Soma | Kwa nini? |`;
    expect(
      parseRepositoryDesign(source, { ...entry(source), subject: "Kiswahili" })
        .outcomes,
    ).toBe(2);
  });
  it("keeps all 80 files pinned and exposes sparse senior coverage rather than fabricating subjects", () => {
    expect(manifest.files).toHaveLength(80);
    expect(manifest.commit).toMatch(/^[a-f0-9]{40}$/);
    expect(manifest.files.filter((f) => f.grade === "Grade 7")).toHaveLength(
      16,
    );
    expect(manifest.files.filter((f) => f.grade === "Grade 12")).toHaveLength(
      2,
    );
    expect(new Set(manifest.files.map((f) => f.id)).size).toBe(80);
  });
  it("imports idempotently into existing collection jobs and never auto-indexes or publishes", async () => {
    const f = manifest.files.find((e) => e.grade === "Grade 7")!;
    const tx = {
      $executeRaw: jest.fn(),
      collectionAsset: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn(),
      },
      contentCollection: {
        create: jest.fn().mockResolvedValue({ id: "collection" }),
      },
      contentLibraryJob: { createMany: jest.fn() },
    };
    const prisma = { $transaction: jest.fn().mockImplementation((f) => f(tx)) };
    const s = new GitHubCurriculumService(prisma as any);
    jest
      .spyOn(s as any, "report")
      .mockResolvedValue({ commit: manifest.commit, files: [] });
    expect(
      await s.importDesigns(
        {
          grades: ["Grade 7"],
          fileIds: [f.id],
          commit: manifest.commit,
          rightsConfirmed: true,
        },
        { id: 42 } as any,
      ),
    ).toMatchObject({ queued: 1, skipped: 0 });
    expect(
      tx.contentLibraryJob.createMany.mock.calls[0][0].data[0],
    ).toMatchObject({
      kind: "INGEST_GITHUB",
      input: {
        sourceId: f.id,
        commit: manifest.commit,
        grade: f.grade,
        subject: f.subject,
      },
    });
    tx.collectionAsset.findMany.mockResolvedValue([
      { origin: f.sourceUrl, collectionId: "collection" },
    ]);
    expect(
      await s.importDesigns(
        {
          grades: ["Grade 7"],
          fileIds: [f.id],
          commit: manifest.commit,
          rightsConfirmed: true,
        },
        { id: 42 } as any,
      ),
    ).toMatchObject({ queued: 0, skipped: 1 });
    expect(tx.contentCollection.create).toHaveBeenCalledTimes(1);
    await expect(
      s.importDesigns(
        {
          grades: ["Grade 8"],
          fileIds: [f.id],
          commit: manifest.commit,
          rightsConfirmed: true,
        },
        { id: 42 } as any,
      ),
    ).rejects.toThrow("selected grades");
  });
  it("requires explicit acknowledgement for known source gaps and prevents a mapping body from replacing provenance", async () => {
    const parsed = parseRepositoryDesign(text, entry());
    const source = {
      commit: manifest.commit,
      coverage: parsed.coverage,
      limitationsReviewed: false,
    };
    const asset = {
      id: "a",
      status: "REVIEW",
      mapping: { ...parsed.mapping, _source: source },
      extractedText: parsed.text,
      collection: { grades: ["Grade 7"] },
    };
    const prisma = {
      collectionAsset: {
        findMany: jest.fn().mockResolvedValue([asset]),
        findUnique: jest.fn().mockResolvedValue(asset),
        update: jest.fn().mockImplementation((x) => x),
      },
    };
    const s = new CollectionService(
      prisma as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    await expect(s.approve(["a"], { id: 42 } as any)).rejects.toThrow(
      "acknowledge",
    );
    await s.saveMapping(
      "a",
      { ...parsed.mapping, _source: { commit: "forged" } },
      true,
    );
    expect(
      prisma.collectionAsset.update.mock.calls[0][0].data.mapping._source,
    ).toMatchObject({ commit: manifest.commit, limitationsReviewed: true });
  });
});
