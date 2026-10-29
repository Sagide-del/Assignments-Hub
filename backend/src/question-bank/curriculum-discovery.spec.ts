import * as official from "./official-curriculum";
import * as downloads from "./collection-fetch";
import { ContentLibraryService } from "./content-library.service";
import { CollectionService } from "./collection.service";
const root =
  '<a href="/cbc-materials/curriculum-designs/grade-seven-designs/">Grade Seven</a>';
const directory = official.knownGradeDirectory("Grade 7");
const response = (url: string, html: string) => ({
  url,
  type: "text/html",
  bytes: Buffer.from(html),
});
const service = () =>
  new ContentLibraryService({} as any, {} as any, {} as any, {} as any);
const saved = (html: string) =>
  ({ originalname: "KICD.html", buffer: Buffer.from(html) }) as any;
describe("Curriculum discovery formats and recoveries", () => {
  afterEach(() => jest.restoreAllMocks());
  it("extracts PDF embeds, Google viewers and extensionless downloads, retaining subject headings", () => {
    const html = `<h3>English</h3><iframe src="https://drive.google.com/file/d/EnglishDocument12345/preview"></iframe>
  <h3>Mathematics</h3><object data="/files/Grade-7-Mathematics.pdf"></object>
  <h3>Kiswahili</h3><iframe src="https://docs.google.com/gview?url=https%3A%2F%2Fkicd.ac.ke%2Ffiles%2FGrade-7-Kiswahili.pdf&amp;embedded=1"></iframe>
  <a href="/download/science/?wpdmdl=123">Integrated Science Grade 7</a>
  <embed src="/viewer.html?file=%2Ffiles%2FGrade-7-Social-Studies.pdf">`;
    const links = official.curriculumLinks(html, directory);
    expect(links).toHaveLength(5);
    expect(links.every((l) => l.pdf)).toBe(true);
    expect(links.find((l) => l.url.includes("EnglishDocument"))).toMatchObject({
      title: expect.stringContaining("English"),
    });
    expect(links.some((l) => l.url.endsWith("Grade-7-Kiswahili.pdf"))).toBe(
      true,
    );
    expect(
      links.some((l) => l.url.endsWith("Grade-7-Social-Studies.pdf")),
    ).toBe(true);
  });
  it("follows a KICD-linked public folder and same-site sibling subject page", async () => {
    const fetch = jest
      .spyOn(official, "fetchOfficial")
      .mockImplementation(async (url) =>
        response(
          url,
          url === directory
            ? '<iframe src="https://drive.google.com/embeddedfolderview?id=PublicGrade7Folder123#list"></iframe><a href="/cbc-materials/curriculum-designs/junior/english/">English</a>'
            : url.includes("embeddedfolderview")
              ? '<a href="https://drive.google.com/file/d/MathGrade7Document123/view">Grade 7 Mathematics.pdf</a>'
              : url.endsWith("/junior/english/")
                ? '<object data="/files/Grade-7-English.pdf"></object>'
                : "",
        ),
      );
    const result = await service().discover(saved(root), ["Grade 7"]);
    expect(result.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: "Mathematics",
          grade: "Grade 7",
          url: expect.stringContaining("export=download"),
        }),
        expect.objectContaining({ subject: "English", grade: "Grade 7" }),
      ]),
    );
    expect(
      fetch.mock.calls.some(([url]) => url.endsWith("/junior/english/")),
    ).toBe(true);
    expect(result.candidates.every((c) => !!c.sourcePage)).toBe(true);
  });
  it("uses public WordPress rendered content when a directory shell has no document links", async () => {
    jest.spyOn(official, "fetchOfficial").mockImplementation(async (url) =>
      response(
        url,
        url.includes("/wp-json/")
          ? JSON.stringify([
              {
                content: {
                  rendered:
                    '<h3>English</h3><iframe src="/files/Grade-7-English.pdf"></iframe>',
                },
              },
            ])
          : "<main>Curriculum documents load here</main>",
      ),
    );
    const result = await service().discover(saved(root), ["Grade 7"]);
    expect(result.candidates).toEqual([
      expect.objectContaining({ subject: "English", grade: "Grade 7" }),
    ]);
    expect(result.diagnostics[0]).toMatchObject({ viewers: 1, extracted: 1 });
  });
  it("uses the canonical URL of a saved grade page without re-fetching that page", async () => {
    const fetch = jest
      .spyOn(official, "fetchOfficial")
      .mockRejectedValue(Error("Network unavailable"));
    const result = await service().discover(
      saved(
        `<link rel="canonical" href="${directory}"><iframe title="English" src="/files/English.pdf"></iframe>`,
      ),
      ["Grade 7"],
    );
    expect(result.candidates).toEqual([
      expect.objectContaining({
        subject: "English",
        grade: "Grade 7",
        url: "https://kicd.ac.ke/files/English.pdf",
      }),
    ]);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("tries recorded official grade directories if the overview is unavailable", async () => {
    jest.spyOn(official, "fetchOfficial").mockImplementation(async (url) => {
      if (url === "https://kicd.ac.ke/cbc-materials/")
        throw Error("Overview unavailable");
      return response(url, '<a href="/files/Grade-7-English.pdf">English</a>');
    });
    const result = await service().discover(undefined, ["Grade 7"]);
    expect(result.candidates[0]).toMatchObject({
      subject: "English",
      grade: "Grade 7",
    });
    expect(result.errors[0].message).toContain("main directory");
  });
  it("reports unreadable embedded pages as an extraction failure, never an empty syllabus", async () => {
    jest
      .spyOn(official, "fetchOfficial")
      .mockImplementation(async (url) =>
        response(
          url,
          url.includes("/wp-json/")
            ? "[]"
            : '<iframe src="https://unsupported.test/viewer"></iframe>',
        ),
      );
    const result = await service().discover(saved(root), ["Grade 7"]);
    expect(result.candidates).toEqual([]);
    expect(result.diagnostics[0]).toMatchObject({ viewers: 1, extracted: 0 });
    expect(
      result.errors.some((e) => e.message.includes("discovery-format problem")),
    ).toBe(true);
  });
  it("recognises literal public folder file links and PDF-labelled file rows without running script", () => {
    const folder =
      "https://drive.google.com/drive/folders/PublicGrade7Folder123";
    const links = official.curriculumLinks(
      '<div data-id="EnglishFile123456" aria-label="Grade 7 English.pdf"></div><script>window.go="https:\\/\\/drive.google.com/file/d/MathFile1234567/view"</script>',
      folder,
    );
    expect(links.map((l) => l.url)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("EnglishFile123456"),
        expect.stringContaining("MathFile1234567"),
      ]),
    );
  });
  it("preserves public resource keys and uses a readable folder view", () => {
    expect(
      official.hostedCurriculumUrl(
        "https://drive.google.com/drive/u/0/folders/PublicFolder12345?resourcekey=0-PublicKey",
      ),
    ).toBe(
      "https://drive.google.com/embeddedfolderview?id=PublicFolder12345&resourcekey=0-PublicKey",
    );
    expect(
      official.hostedCurriculumUrl(
        "https://drive.google.com/file/d/PublicFile12345/view?resourcekey=0-PublicKey",
      ),
    ).toContain("resourcekey=0-PublicKey");
    expect(
      official.isHostedFolder(
        "https://drive.google.com/drive/u/0/folders/PublicFolder12345",
      ),
    ).toBe(true);
  });
  it("rejects login URLs, spoofed hosts and external viewer destinations", () => {
    for (const url of [
      "https://drive.google.com.evil.test/file/d/EnglishFile1234/view",
      "https://drive.google.com/accounts/login",
      "https://docs.google.com/gview?url=https://evil.test/file.pdf",
      "https://user@drive.google.com/file/d/EnglishFile1234/view",
    ])
      expect(() => official.curriculumResourceUrl(url)).toThrow();
  });
  it("does not feed a sign-in page to the mapping AI as curriculum", async () => {
    const ai = { generateAssignment: jest.fn() };
    const prisma = {
      collectionAsset: {
        findUnique: jest.fn().mockResolvedValue({
          id: "a",
          status: "QUEUED",
          origin:
            "https://drive.google.com/uc?export=download&id=EnglishFile123456",
          collection: { grades: ["Grade 7"] },
        }),
        update: jest.fn(),
      },
    };
    jest
      .spyOn(downloads, "fetchCollection")
      .mockResolvedValue(
        response(
          "https://drive.google.com/uc?export=download&id=EnglishFile123456",
          "<h1>You need access. Sign in.</h1>",
        ),
      );
    const s = new CollectionService(
      prisma as any,
      {} as any,
      ai as any,
      {} as any,
      {} as any,
      { get: () => "" } as any,
      {} as any,
    );
    await expect(
      s.process({ id: "job", kind: "INGEST_URL", input: { assetId: "a" } }, {
        id: 1,
      } as any),
    ).rejects.toThrow("did not return a PDF");
    expect(ai.generateAssignment).not.toHaveBeenCalled();
    expect(prisma.collectionAsset.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED" }),
      }),
    );
  });
});
