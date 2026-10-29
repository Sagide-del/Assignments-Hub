import * as official from "./official-curriculum";
import { ContentLibraryService } from "./content-library.service";
import {
  DiscoverCurriculumDto,
  ImportSourceDto,
  LibraryGenerationDto,
} from "./content-library.dto";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
const actor = { id: 1, role: "PLATFORM_ADMIN" } as any;
describe("Grade 6–12 bulk curriculum", () => {
  afterEach(() => jest.restoreAllMocks());
  it("recognises all seven numeric and word grade labels without matching Grade 60", () => {
    ["six", "seven", "eight", "nine", "ten", "eleven", "twelve"].forEach(
      (name, i) => {
        expect(official.detectedGrades(`GRADE ${name}`)).toEqual([
          `Grade ${i + 6}`,
        ]);
        expect(official.detectedGrades(`GRADE ${i + 6}`)).toEqual([
          `Grade ${i + 6}`,
        ]);
      },
    );
    expect(official.detectedGrades("Grade 60")).toEqual([]);
  });
  it("accepts Grade 6, combined generation and 80 sources, rejecting unsupported grades", async () => {
    expect(
      await validate(
        plainToInstance(ImportSourceDto, {
          url: "https://kicd.ac.ke/grade6.pdf",
          grade: "Grade 6",
          subject: "Science and Technology",
        }),
      ),
    ).toEqual([]);
    expect(
      await validate(
        plainToInstance(LibraryGenerationDto, {
          sourceIds: Array.from({ length: 80 }, (_, i) => i + 1),
          kind: "BOTH",
          count: 30,
        }),
      ),
    ).toEqual([]);
    expect(
      await validate(
        plainToInstance(DiscoverCurriculumDto, {
          grades: JSON.stringify(["Grade 6", "Grade 12"]),
        }),
      ),
    ).toEqual([]);
    expect(
      (
        await validate(
          plainToInstance(DiscoverCurriculumDto, { grades: '["Grade 5"]' }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });
  it("discovers only selected grades and nested subject pages and exposes missing-grade exceptions", async () => {
    const root =
      '<a href="/cbc-materials/curriculum-designs/grade-six-designs/">Grade Six</a><a href="/cbc-materials/curriculum-designs/grade-seven-designs/">Grade Seven</a><a href="/cbc-materials/curriculum-designs/grade-twelve/">Grade Twelve</a>';
    const fetch = jest
      .spyOn(official, "fetchOfficial")
      .mockImplementation(async (url) => ({
        bytes: Buffer.from(
          url.includes("/science/")
            ? '<a href="/files/grade-6-science-and-technology.pdf">Science and Technology</a>'
            : url.includes("six-designs")
              ? '<a href="./science/">Science</a>'
              : url.includes("twelve")
                ? '<a href="/files/grade-12-chemistry.pdf">Chemistry</a>'
                : "",
        ),
        url,
        type: "text/html",
      }));
    const service = new ContentLibraryService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    const result = await service.discover(
      { buffer: Buffer.from(root), originalname: "KICD.html" } as any,
      ["Grade 6", "Grade 12", "Grade 11"],
    );
    expect(
      fetch.mock.calls.some(([url]) => url.includes("seven-designs")),
    ).toBe(false);
    expect(result.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          grade: "Grade 6",
          subject: "Science and Technology",
        }),
        expect.objectContaining({ grade: "Grade 12", subject: "Chemistry" }),
      ]),
    );
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ grade: "Grade 11" })]),
    );
  });
  it("flags unknown subject titles instead of assigning one subject list to all grades", () => {
    expect(
      official.suggestedSubject(
        "Science and Technology",
        "https://kicd.ac.ke/GRADE-6.pdf",
      ),
    ).toBe("Science and Technology");
    expect(
      official.suggestedSubject(
        "General curriculum framework",
        "https://kicd.ac.ke/framework.pdf",
      ),
    ).toBeUndefined();
  });
  it("queues both content types for each actual grade/subject source", async () => {
    const sources = [
      { id: 1, grade: "Grade 6", subject: "Science and Technology" },
      { id: 2, grade: "Grade 12", subject: "Chemistry" },
    ];
    const prisma = {
      questionBankSourceDocument: {
        findMany: jest.fn().mockResolvedValue(sources),
      },
      $executeRaw: jest.fn(),
      contentLibraryJob: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest
          .fn()
          .mockImplementation(({ data }) => Promise.resolve(data)),
      },
      $transaction: jest.fn().mockImplementation(function (
        this: any,
        values: any,
      ) {
        return typeof values === "function"
          ? values(this)
          : Promise.all(values);
      }),
    };
    const service = new ContentLibraryService(
      prisma as any,
      {} as any,
      {} as any,
      {} as any,
    );
    const jobs = await service.generate(
      { sourceIds: [1, 2], kind: "BOTH", count: 30 },
      actor,
    );
    expect(jobs).toHaveLength(4);
    expect(
      jobs.map((j) => [
        j.kind,
        (j.input as any).grade,
        (j.input as any).subject,
      ]),
    ).toEqual([
      ["QUESTIONS", "Grade 6", "Science and Technology"],
      ["CARDS", "Grade 6", "Science and Technology"],
      ["QUESTIONS", "Grade 12", "Chemistry"],
      ["CARDS", "Grade 12", "Chemistry"],
    ]);
  });
  it("skips indexed documents, pending jobs and repeated rows in one bulk import", async () => {
    const source = (n: number) => ({
      url: `https://kicd.ac.ke/grade-6-${n}.pdf`,
      grade: "Grade 6",
      subject: "Mathematics",
    });
    const tx = {
      $executeRaw: jest.fn(),
      questionBankSourceDocument: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ ...source(1), fileName: source(1).url }]),
      },
      contentLibraryJob: {
        findMany: jest.fn().mockResolvedValue([{ input: source(2) }]),
        create: jest
          .fn()
          .mockImplementation(({ data }) => Promise.resolve(data)),
      },
    };
    const prisma = {
      $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
    };
    const service = new ContentLibraryService(
      prisma as any,
      {} as any,
      {} as any,
      {} as any,
    );
    expect(
      await service.imports(
        { sources: [source(1), source(2), source(3), source(3)] },
        actor,
      ),
    ).toMatchObject({ queued: 1, skipped: 3 });
    expect(tx.contentLibraryJob.create).toHaveBeenCalledTimes(1);
  });
});
