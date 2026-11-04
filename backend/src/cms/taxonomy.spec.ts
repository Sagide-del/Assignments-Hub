import { CmsService } from "./cms.service";
import { cmsGradeBand, verifiedCmsAsset } from "./grade-band";
import { TAXONOMY_SEED, validateTaxonomySeed } from "../scripts/seed-taxonomy";
import { validateCmsGeneratedContent } from "./generated-content";
function content(grade: number, subject: string, topic: string) {
  const band = cmsGradeBand(grade);
  const body: any = {
    theory_text: Array(band.theoryWords).fill("Learning").join(" "),
    questions: Array.from({ length: band.questions }, (_, i) => ({
      question_text: `Question ${i + 1}`,
      options: ["a", "b", "c", "d"],
      correct_answer: "a",
      explanation: "Reason",
    })),
  };
  if (band.extra === "offline_activity")
    body.offline_activity =
      "Count five safe household objects with a caregiver.";
  else if (band.extra === "diagram_description")
    body.diagram_description = "A labelled diagram of the investigation.";
  else
    Object.assign(body, {
      equations: [],
      illustration_prompt: "A labelled graph.",
      asset_url: verifiedCmsAsset(subject, topic),
    });
  return body;
}
function setup() {
  const prisma = {
    masterModule: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(async ({ data }) => ({ id: "module", ...data })),
    },
    curriculumTaxonomy: {
      findMany: jest.fn(async ({ where }) =>
        TAXONOMY_SEED.filter((row) => row.grade === where.grade).map(
          (row, i) => ({
            ...row,
            id: `tax-${i}`,
            source: "USER_PROVIDED",
            verified: false,
          }),
        ),
      ),
    },
  };
  const ai = { generateAssignment: jest.fn() };
  return { prisma, ai, service: new CmsService(prisma as any, ai as any) };
}
describe("Supplied curriculum taxonomy and grade bands", () => {
  it("retains the exact supplied coverage including all 20 Grade 12 subjects", () => {
    expect(validateTaxonomySeed()).toHaveLength(83);
    expect(TAXONOMY_SEED.reduce((sum, row) => sum + row.topics.length, 0)).toBe(
      371,
    );
    expect([...new Set(TAXONOMY_SEED.map((row) => row.grade))]).toEqual([
      1, 4, 7, 10, 11, 12,
    ]);
    expect(TAXONOMY_SEED.filter((row) => row.grade === 12)).toHaveLength(20);
    expect(
      TAXONOMY_SEED.find(
        (row) => row.grade === 12 && row.subject === "Mathematics",
      )?.topics,
    ).toEqual([
      "Advanced Calculus",
      "Complex Numbers",
      "Vectors and Matrices",
      "Probability and Statistics",
      "KCBE Mock Exam Practice",
    ]);
    expect(
      TAXONOMY_SEED.filter((row) => row.grade <= 9).every(
        (row) => row.pathway === null && row.track === null,
      ),
    ).toBe(true);
    expect(() =>
      validateTaxonomySeed([{ ...TAXONOMY_SEED[0], pathway: "STEM" }]),
    ).toThrow("null pathway");
    expect(() =>
      validateTaxonomySeed([
        {
          ...TAXONOMY_SEED.find((row) => row.grade === 12)!,
          track: "Invented track",
        },
      ]),
    ).toThrow("pairing");
  });
  it.each([
    [1, 5, 150],
    [6, 5, 150],
    [7, 10, 200],
    [9, 10, 200],
    [10, 30, 300],
    [12, 30, 300],
  ])(
    "routes Grade %i to %i questions and %i words",
    (grade, questions, theoryWords) => {
      expect(cmsGradeBand(grade)).toMatchObject({ questions, theoryWords });
    },
  );
  it.each([
    [1, "Literacy Activities", "Listening and Speaking"],
    [4, "English", "Grammar and Vocabulary"],
    [7, "Integrated Science", "Scientific Investigation"],
    [10, "Biology", "Respiration and Gaseous Exchange"],
    [11, "Aviation Technology", "Aerodynamics"],
    [12, "Mathematics", "Advanced Calculus"],
  ])(
    "generates and saves the correct Grade %i module without inventing taxonomy",
    async (grade: number, subject: string, topic: string) => {
      const { prisma, ai, service } = setup(),
        band = cmsGradeBand(grade);
      ai.generateAssignment.mockResolvedValue({
        content: content(grade, subject, topic),
        usage: { totalTokens: 100 },
      });
      const saved = await service.generateAiContent({ grade, subject, topic });
      expect((saved.content_json as any).questions).toHaveLength(
        band.questions,
      );
      expect((saved.content_json as any).theory_text.split(/\s+/)).toHaveLength(
        band.theoryWords,
      );
      expect((saved.content_json as any).expected_question_count).toBe(
        band.questions,
      );
      expect((saved.content_json as any).taxonomy_verified).toBe(false);
      expect(saved.status).toBe("DRAFT");
      expect(saved.generation_cost_tokens).toBe(100);
      expect(saved.pathway).toBe(grade <= 9 ? null : "STEM");
      expect(ai.generateAssignment.mock.calls[0][0]).toContain(
        `exactly ${band.questions} distinct`,
      );
      expect(prisma.masterModule.create).toHaveBeenCalledTimes(1);
    },
  );
  it("rejects missing grades, arbitrary topics and wrong pathway/track before spending AI credit", async () => {
    const { service, ai } = setup();
    for (const dto of [
      { grade: 6, subject: "English", topic: "Reading" },
      { grade: 12, subject: "Mathematics", topic: "Invented topic" },
      {
        grade: 7,
        subject: "Integrated Science",
        topic: "Scientific Investigation",
        pathway: "STEM",
      },
      {
        grade: 12,
        subject: "Mathematics",
        topic: "Advanced Calculus",
        track: "Languages",
      },
      {
        grade: 12,
        subject: "Mathematics",
        topic: "Advanced Calculus",
        level: "Early Years",
      },
    ])
      await expect(service.generateAiContent(dto)).rejects.toThrow();
    expect(ai.generateAssignment).not.toHaveBeenCalled();
  });
  it("strictly validates band-specific extras, counts and verified 3D assets", () => {
    const primary = content(1, "Literacy Activities", "Reading Readiness"),
      primaryBand = cmsGradeBand(1);
    expect(validateCmsGeneratedContent(primary, 5, primaryBand)).toHaveProperty(
      "offline_activity",
    );
    expect(() =>
      validateCmsGeneratedContent(
        { ...primary, questions: primary.questions.slice(0, 4) },
        5,
        primaryBand,
      ),
    ).toThrow();
    const senior = content(12, "Mathematics", "Advanced Calculus");
    expect(() =>
      validateCmsGeneratedContent(
        { ...senior, asset_url: "https://invented.test/model.glb" },
        30,
        cmsGradeBand(12),
      ),
    ).toThrow("Unverified asset");
  });
  it("fails clearly when taxonomy storage is unavailable without calling AI", async () => {
    const { service, prisma, ai } = setup();
    prisma.curriculumTaxonomy.findMany.mockRejectedValueOnce(
      Error("missing table") as never,
    );
    await expect(
      service.generateAiContent({
        grade: 12,
        subject: "Mathematics",
        topic: "Advanced Calculus",
      }),
    ).rejects.toThrow("taxonomy is unavailable");
    expect(ai.generateAssignment).not.toHaveBeenCalled();
  });
});
