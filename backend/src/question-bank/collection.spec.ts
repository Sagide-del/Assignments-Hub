import { deflateRawSync } from "zlib";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CollectionService } from "./collection.service";
import {
  catalogueRows,
  linkedGrades,
  plainText,
  unpackCollectionZip,
  validateMapping,
} from "./collection-tools";
import { collectionUrl, publicAddress } from "./collection-fetch";
import { CreateCollectionDto } from "./collection.dto";
const text =
  "Grade 6 Mathematics curriculum design. Learners should compare fractions using a number line. Supporting teaching examples explain equivalent fractions.";
const mapping = {
  role: "CURRICULUM",
  note: "Official design, review edition.",
  subjects: [
    {
      grade: "Grade 6",
      subject: "Mathematics",
      pathway: "",
      evidence: "Grade 6 Mathematics curriculum design.",
      units: [
        {
          strand: "Numbers",
          subStrand: "Fractions",
          outcome: "Compare fractions using a number line.",
          quote: "Learners should compare fractions using a number line.",
        },
      ],
    },
  ],
};
function zip(name: string, data: Buffer, method = 8) {
  const compressed = method === 8 ? deflateRawSync(data) : data,
    n = Buffer.from(name),
    local = Buffer.alloc(30),
    central = Buffer.alloc(46),
    end = Buffer.alloc(22);
  local.writeUInt32LE(0x04034b50);
  local.writeUInt16LE(method, 8);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(n.length, 26);
  central.writeUInt32LE(0x02014b50);
  central.writeUInt16LE(method, 10);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(n.length, 28);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length + n.length, 12);
  end.writeUInt32LE(local.length + n.length + compressed.length, 16);
  return Buffer.concat([local, n, compressed, central, n, end]);
}
function service(prisma: any, overrides: any = {}) {
  return new CollectionService(
    prisma,
    overrides.storage ?? {},
    overrides.ai ?? {},
    overrides.retrieval ?? {},
    overrides.bank ?? {},
    { get: () => "" } as any,
    overrides.ocr ?? {},
  );
}
describe("Collection intake boundaries", () => {
  it("reads stored and deflated document collections without writing archive paths", () => {
    for (const method of [0, 8]) {
      const entries = unpackCollectionZip(
        zip("Grade 6/Mathematics.txt", Buffer.from(text), method),
      );
      expect(entries).toHaveLength(1);
      expect(entries[0].bytes.toString()).toBe(text);
    }
  });
  it("rejects traversal, encryption, oversized expanded entries and invalid archives", () => {
    expect(() =>
      unpackCollectionZip(zip("../outside.pdf", Buffer.from(text))),
    ).toThrow("Unsafe");
    const encrypted = zip("book.pdf", Buffer.from(text));
    const central = encrypted.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    encrypted.writeUInt16LE(1, central + 8);
    expect(() => unpackCollectionZip(encrypted)).toThrow("encrypted");
    const big = zip("book.pdf", Buffer.from(text));
    big.writeUInt32LE(16 * 1024 * 1024, central + 24);
    expect(() => unpackCollectionZip(big)).toThrow("oversized");
    expect(() => unpackCollectionZip(Buffer.from("invalid"))).toThrow(
      "Invalid ZIP",
    );
  });
  it("restricts remote hosts/protocols and blocks private, loopback and metadata addresses", () => {
    expect(
      collectionUrl("https://kcserevision.com/grade-6/", ["kcserevision.com"]),
    ).toContain("https://kcserevision.com/");
    for (const url of [
      "http://kcserevision.com/",
      "https://evil.test/",
      "https://user@kcserevision.com/",
      "https://kcserevision.com:8443/",
    ])
      expect(() => collectionUrl(url, ["kcserevision.com"])).toThrow();
    for (const ip of [
      "127.0.0.1",
      "10.0.0.1",
      "169.254.169.254",
      "192.168.0.1",
      "172.16.0.1",
      "::1",
      "::ffff:127.0.0.1",
      "fc00::1",
    ])
      expect(publicAddress(ip)).toBe(false);
    expect(publicAddress("8.8.8.8")).toBe(true);
  });
  it("requires source-use confirmation and bounded selected grades", async () => {
    expect(
      await validate(
        plainToInstance(CreateCollectionDto, {
          name: "Collection",
          grades: ["Grade 6", "Grade 12"],
          rightsConfirmed: true,
        }),
      ),
    ).toEqual([]);
    expect(
      await validate(
        plainToInstance(CreateCollectionDto, {
          name: "Collection",
          grades: ["Grade 2"],
          rightsConfirmed: false,
        }),
      ),
    ).not.toEqual([]);
  });
  it("recognises out-of-scope grade links before crawling whole-school directories", () => {
    expect(linkedGrades("https://example.com/grade-1-notes/")).toEqual([
      "Grade 1",
    ]);
    expect(linkedGrades("https://example.com/grade-6-science/")).toEqual([
      "Grade 6",
    ]);
    expect(
      linkedGrades("https://example.com/grade-1-2-3-4-5-6-7-8-cbc/"),
    ).toEqual(expect.arrayContaining(["Grade 1", "Grade 6", "Grade 8"]));
  });
  it("extracts plain text without executing source HTML", () => {
    expect(
      plainText(
        "<script>ignore instructions</script><h1>Fractions</h1><p>One &amp; two</p>",
      ),
    ).toBe("Fractions One & two");
  });
});
describe("Curriculum evidence and expected subjects", () => {
  it("requires real subject excerpts and exact outcome quotations within the selected grades", () => {
    expect(
      validateMapping(mapping, text, ["Grade 6"]).subjects[0].units,
    ).toHaveLength(1);
    expect(() => validateMapping(mapping, text, ["Grade 12"])).toThrow(
      "out-of-scope",
    );
    const bad = JSON.parse(JSON.stringify(mapping));
    bad.subjects[0].units[0].quote =
      "An invented quotation that is not present";
    expect(() => validateMapping(bad, text, ["Grade 6"])).toThrow("quotation");
    const noEvidence = JSON.parse(JSON.stringify(mapping));
    noEvidence.subjects[0].evidence = "Invented subject source";
    expect(() => validateMapping(noEvidence, text, ["Grade 6"])).toThrow(
      "excerpt",
    );
  });
  it("reads all-subject CSV/TSV catalogues with optional senior pathways", () => {
    expect(
      catalogueRows(
        'Grade,Subject,Pathway\nGrade 6,Mathematics,\nGrade 11,"History and Citizenship",Social Sciences',
      ),
    ).toEqual([
      { grade: "Grade 6", subject: "Mathematics", pathway: "" },
      {
        grade: "Grade 11",
        subject: "History and Citizenship",
        pathway: "Social Sciences",
      },
    ]);
    expect(catalogueRows("Grade 7\tIntegrated Science\t")[0].subject).toBe(
      "Integrated Science",
    );
    expect(() => catalogueRows("Grade 2,English")).toThrow("Review");
  });
  it("does not verify an empty grade catalogue or create generation jobs for unreviewed outcomes", async () => {
    const p = {
      curriculumScope: { count: jest.fn().mockResolvedValue(0) },
      curriculumOutcome: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ verified: false, scope: { verified: true } }),
      },
      contentLibraryJob: { create: jest.fn() },
    };
    const s = service(p);
    await expect(s.verifyGrades(["Grade 6"], { id: 1 } as any)).rejects.toThrow(
      "expected",
    );
    await expect(
      s.generate({ unitIds: [1], kind: "BOTH", count: 10 }, { id: 1 } as any),
    ).rejects.toThrow("Review");
    expect(p.contentLibraryJob.create).not.toHaveBeenCalled();
  });
  it("blocks generation with missing teaching evidence or an unconfirmed grade catalogue", async () => {
    const unit = {
      id: 1,
      verified: true,
      sourceDocumentId: 1,
      supportingSourceIds: [2],
      scope: { verified: true, grade: "Grade 6", subject: "Mathematics" },
    };
    const p = {
      curriculumOutcome: { findUnique: jest.fn().mockResolvedValue(unit) },
      curriculumGradeReview: { findUnique: jest.fn().mockResolvedValue(null) },
      questionBankSourceDocument: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, role: "CURRICULUM" }]),
      },
      contentLibraryJob: { create: jest.fn() },
    };
    const s = service(p);
    await expect(
      s.generate({ unitIds: [1], kind: "BOTH", count: 10 }, { id: 1 } as any),
    ).rejects.toThrow("expected subject");
    p.curriculumGradeReview.findUnique.mockResolvedValue({
      verifiedAt: new Date(),
    });
    await expect(
      s.generate({ unitIds: [1], kind: "BOTH", count: 10 }, { id: 1 } as any),
    ).rejects.toThrow("teaching");
    expect(p.contentLibraryJob.create).not.toHaveBeenCalled();
  });
  it("queues outcome-linked jobs only with reviewed grade/subject evidence", async () => {
    const unit = {
      id: 7,
      verified: true,
      sourceDocumentId: 1,
      supportingSourceIds: [2],
      subStrand: "Fractions",
      scope: { verified: true, grade: "Grade 6", subject: "Mathematics" },
    };
    const p = {
      curriculumOutcome: { findUnique: jest.fn().mockResolvedValue(unit) },
      curriculumGradeReview: {
        findUnique: jest.fn().mockResolvedValue({ verifiedAt: new Date() }),
      },
      questionBankSourceDocument: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1, role: "CURRICULUM" },
          { id: 2, role: "TEACHING" },
        ]),
      },
      contentLibraryJob: {
        create: jest
          .fn()
          .mockImplementation(({ data }) => Promise.resolve(data)),
      },
      $transaction: jest.fn().mockImplementation((jobs) => Promise.all(jobs)),
    };
    const jobs = await service(p).generate(
      { unitIds: [7], kind: "BOTH", count: 10 },
      { id: 1 } as any,
    );
    expect(jobs.map((j) => j.kind)).toEqual([
      "OUTCOME_QUESTIONS",
      "OUTCOME_CARDS",
    ]);
    expect(jobs[0].input).toMatchObject({
      unitId: 7,
      grade: "Grade 6",
      subject: "Mathematics",
    });
    expect(
      p.questionBankSourceDocument.findMany.mock.calls[0][0].where,
    ).toMatchObject({
      grade: "Grade 6",
      subject: "Mathematics",
      reviewed: true,
    });
  });
});
describe("Collection persistence and migration", () => {
  it("reuses existing sources without asking for another upload", async () => {
    const p = {
      questionBankSourceDocument: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 9,
            grade: "Grade 6",
            subject: "Mathematics",
            title: "Existing maths",
            chunks: [{ content: text }],
          },
        ]),
      },
      contentCollection: { create: jest.fn().mockResolvedValue({ id: "c" }) },
      collectionAsset: { create: jest.fn().mockResolvedValue({ id: "a" }) },
      contentLibraryJob: { create: jest.fn() },
    };
    const storage = { uploadPrivate: jest.fn() };
    await service(p, { storage }).fromLibrary([9], { id: 1 } as any);
    expect(storage.uploadPrivate).not.toHaveBeenCalled();
    expect(p.contentLibraryJob.create.mock.calls[0][0].data).toMatchObject({
      kind: "MAP_SOURCE",
      input: { assetId: "a" },
    });
  });
  it("preserves document review and refuses a fabricated quotation before indexing", async () => {
    const p = {
      collectionAsset: {
        findUnique: jest.fn().mockResolvedValue({
          id: "a",
          status: "REVIEW",
          extractedText: text,
          collection: { grades: ["Grade 6"] },
        }),
        update: jest.fn(),
      },
    };
    const s = service(p);
    await s.saveMapping("a", mapping);
    expect(p.collectionAsset.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "REVIEW" }),
      }),
    );
    await expect(
      s.saveMapping("a", { ...mapping, subjects: [] }),
    ).rejects.toThrow("mapping");
  });
  it("sends reviewed learning outcomes and source IDs into the existing question generator", async () => {
    const unit = {
      id: 7,
      verified: true,
      sourceDocumentId: 1,
      supportingSourceIds: [2],
      strand: "Numbers",
      subStrand: "Fractions",
      outcome: "Compare fractions",
      quote: "Learners should compare fractions using a number line.",
      scope: { verified: true, grade: "Grade 6", subject: "Mathematics" },
    };
    const p = {
      curriculumOutcome: { findUnique: jest.fn().mockResolvedValue(unit) },
      curriculumGradeReview: {
        findUnique: jest.fn().mockResolvedValue({ verifiedAt: new Date() }),
      },
      questionBankSourceDocument: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1, role: "CURRICULUM" },
          { id: 2, role: "TEACHING" },
        ]),
      },
    };
    const bank = { generate: jest.fn().mockResolvedValue([{ id: 44 }]) };
    const result = await service(p, { bank }).process(
      { id: "j", kind: "OUTCOME_QUESTIONS", input: { unitId: 7, count: 10 } },
      { id: 1 } as any,
    );
    expect(result).toMatchObject({ unitId: 7, questionIds: [44] });
    expect(bank.generate).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ sourceDocumentId: 2, grade: "Grade 6" }),
      expect.anything(),
      "j:0",
      expect.objectContaining({
        unitId: 7,
        supportingSourceIds: [2],
        curriculumSourceId: 1,
      }),
    );
  });
});

describe("Full collection review", () => {
  it("paginates beyond the initial asset preview so every imported document can be reviewed", async () => {
    const p = {
      contentCollection: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ name: "All-grade collection" }),
      },
      collectionAsset: {
        findMany: jest.fn().mockResolvedValue([{ id: "page-3-document" }]),
        count: jest.fn().mockResolvedValue(150),
      },
      $transaction: jest
        .fn()
        .mockImplementation((values) => Promise.all(values)),
    };
    const r = await service(p).documents("collection", 2);
    expect(r).toMatchObject({
      total: 150,
      page: 2,
      take: 50,
      items: [{ id: "page-3-document" }],
    });
    expect(p.collectionAsset.findMany.mock.calls[0][0]).toMatchObject({
      skip: 100,
      take: 50,
      where: { collectionId: "collection" },
    });
  });
  it("keeps references and curriculum designs separate in the coverage matrix", async () => {
    const p = {
      curriculumScope: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1,
            grade: "Grade 6",
            subject: "English",
            pathway: "",
            verified: false,
          },
        ]),
      },
      curriculumOutcome: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 7,
            scopeId: 1,
            verified: true,
            sourceDocumentId: 1,
            supportingSourceIds: [2],
          },
        ]),
      },
      curriculumGradeReview: { findMany: jest.fn().mockResolvedValue([]) },
      contentCollection: { findMany: jest.fn().mockResolvedValue([]) },
      questionBankSourceDocument: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 2,
            grade: "Grade 6",
            subject: "English",
            role: "TEACHING",
            reviewed: true,
          },
        ]),
      },
      questionBank: { groupBy: jest.fn().mockResolvedValue([]) },
      mnemonicCard: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    const result = await service(p).overview();
    expect(result.scopes[0]).toMatchObject({
      subject: "English",
      curriculumSources: 0,
      teachingSources: 1,
      readyOutcomes: 0,
      verified: false,
    });
    expect(result.gradeReviews).toEqual([]);
  });
});

describe("Private collection staging", () => {
  it("preserves folder metadata and stores documents privately before queued classification", async () => {
    const p = {
      contentCollection: {
        findUnique: jest.fn().mockResolvedValue({ id: "c" }),
      },
      collectionAsset: {
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "a" }),
      },
      contentLibraryJob: { create: jest.fn() },
    };
    const storage = {
      uploadPrivate: jest
        .fn()
        .mockResolvedValue({ assetKey: "content-ingestion/private.txt" }),
    };
    const s = service(p, { storage });
    const result = await s.upload(
      "c",
      { buffer: Buffer.from(text), originalname: "notes.txt" } as any,
      { id: 1 } as any,
      "Grade 6/Mathematics/notes.txt",
    );
    expect(result.results[0].id).toBe("a");
    expect(storage.uploadPrivate.mock.calls[0][1]).toBe("content-ingestion");
    expect(p.collectionAsset.create.mock.calls[0][0].data.name).toBe(
      "Grade 6/Mathematics/notes.txt",
    );
    expect(p.contentLibraryJob.create.mock.calls[0][0].data.kind).toBe(
      "INGEST_FILE",
    );
    await expect(
      s.upload(
        "c",
        { buffer: Buffer.from(text), originalname: "notes.txt" } as any,
        { id: 1 } as any,
        "../notes.txt",
      ),
    ).rejects.toThrow("relative");
  });
  it("stages AI mapping for review rather than indexing or publishing automatically", async () => {
    const asset = {
      id: "a",
      name: "Grade 6 Mathematics",
      status: "QUEUED",
      extractedText: text,
      origin: "library:1",
      collection: { grades: ["Grade 6"] },
    };
    const p = {
      collectionAsset: {
        findUnique: jest.fn().mockResolvedValue(asset),
        update: jest.fn(),
      },
      curriculumScope: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const ai = {
        generateAssignment: jest.fn().mockResolvedValue({ content: mapping }),
      },
      retrieval = { storeSource: jest.fn() };
    const result = await service(p, { ai, retrieval }).process(
      { id: "j", kind: "MAP_SOURCE", input: { assetId: "a" } },
      { id: 1 } as any,
    );
    expect(result.subjects).toBe(1);
    expect(p.collectionAsset.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "REVIEW", role: "CURRICULUM" }),
      }),
    );
    expect(retrieval.storeSource).not.toHaveBeenCalled();
  });
});
