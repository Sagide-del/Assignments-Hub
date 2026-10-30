import { CollectionService } from "./collection.service";
import manifest from "./github-curriculum.manifest.json";

describe("Next content batch coverage", () => {
  it("excludes full saved/active sets per mode, but permits short legacy, rejected or failed outcomes", async () => {
    const sources = [
      {
        id: 1,
        reviewed: true,
        role: "CURRICULUM",
        grade: "Grade 7",
        subject: "Mathematics",
      },
    ];
    const p: any = {
      curriculumScope: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1, grade: "Grade 7", subject: "Mathematics", verified: true },
          { id: 2, grade: "Grade 8", subject: "Mathematics", verified: true },
        ]),
      },
      curriculumOutcome: {
        findMany: jest
          .fn()
          .mockResolvedValue(
            Array.from({ length: 7 }, (_, i) => ({
              id: i + 1,
              scopeId: i === 6 ? 2 : 1,
              verified: true,
              sourceDocumentId: 1,
              supportingSourceIds: [],
            })),
          ),
      },
      curriculumGradeReview: { findMany: jest.fn().mockResolvedValue([]) },
      contentCollection: { findMany: jest.fn().mockResolvedValue([]) },
      questionBankSourceDocument: {
        findMany: jest.fn().mockResolvedValue(sources),
      },
      questionBank: {
        groupBy: jest.fn().mockResolvedValue([
          {
            curriculumUnitId: 1,
            questionType: "MULTIPLE_CHOICE",
            status: "GENERATED",
            _count: { _all: 5 },
          },
          {
            curriculumUnitId: 2,
            questionType: "SHORT_ANSWER",
            status: "APPROVED",
            _count: { _all: 5 },
          },
          {
            curriculumUnitId: 3,
            questionType: "MULTIPLE_CHOICE",
            status: "REJECTED",
            _count: { _all: 5 },
          },
        ]),
      },
      mnemonicCard: {
        groupBy: jest
          .fn()
          .mockResolvedValue([
            { curriculumUnitId: 6, isPublished: true, _count: { _all: 5 } },
          ]),
      },
      contentLibraryJob: {
        findMany: jest
          .fn()
          .mockImplementation(async ({ where }) =>
            where.kind === "PREPARE_GRADE"
              ? [
                  {
                    status: "COMPLETED",
                    input: { commit: manifest.commit },
                    result: { readyUnitIds: [1, 2, 3, 4, 5, 6, 7] },
                  },
                ]
              : [
                  { input: { unitId: 4, assessmentMode: "PRACTICE" } },
                  { input: { unitId: 5, assessmentMode: "WRITTEN" } },
                  { input: { unitId: 7, assessmentMode: "PRACTICE" } },
                ],
          ),
      },
    };
    const service = new CollectionService(
      p,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { get: () => "" } as any,
      {} as any,
    );
    const result = await service.overview();
    expect(result.scopes[0]).toMatchObject({
      unitIds: [1, 2, 3, 4, 5, 6],
      nextPracticeUnitIds: [1, 2, 3, 5, 6],
      nextWrittenUnitIds: [1, 2, 3, 4, 6],
    });
    expect(result.scopes[1].nextPracticeUnitIds).toEqual([]);
    expect(p.contentLibraryJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          kind: "OUTCOME_QUESTIONS",
          status: { in: ["QUEUED", "RUNNING"] },
        },
      }),
    );
    // Existing cards do not prevent generation of questions for that outcome.
    expect(result.scopes[0].nextPracticeUnitIds).toContain(6);
  });
});
