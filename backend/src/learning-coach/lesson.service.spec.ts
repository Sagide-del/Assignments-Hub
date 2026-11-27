import { LessonService } from "./lesson.service";

describe("LessonService", () => {
  const actor = { id: 7, schoolId: 3, grade: "Grade 10" } as any;

  function fixture() {
    const prisma = {
      curriculumTaxonomy: { findMany: jest.fn().mockResolvedValue([{ subject: "Mathematics", topics: ["Surds"] }]) },
      user: { findUnique: jest.fn().mockResolvedValue({ weakSubjects: ["Mathematics"] }) },
      lessonContent: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn().mockResolvedValue({ id: "lesson-1", subject: "Mathematics", topic: "Surds", gradeLevel: 10, scriptJson: [], visualizationType: "NONE", visualizationData: {} }) },
      studentLessonProgress: { upsert: jest.fn().mockResolvedValue({ status: "IN_PROGRESS", score: null, completedAt: null }) },
    } as any;
    const ai = { generateAssignment: jest.fn().mockRejectedValue(new Error("offline")) } as any;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as any;
    return { service: new LessonService(prisma, ai, audit), prisma };
  }

  it("marks weak-subject topics as priority", async () => {
    const { service } = fixture();
    await expect(service.topics(actor)).resolves.toEqual([{ subject: "Mathematics", topic: "Surds", priority: true }]);
  });

  it("creates a usable greeting, illustration and question if AI is unavailable", async () => {
    const { service, prisma } = fixture();
    await service.open("Mathematics", "Surds", actor);
    const script = prisma.lessonContent.upsert.mock.calls[0][0].create.scriptJson;
    expect(script.map((step: any) => step.type)).toEqual(expect.arrayContaining(["GREETING", "ILLUSTRATION", "QUESTION"]));
    expect(script.find((step: any) => step.type === "QUESTION").questionOptions).toHaveLength(3);
  });
});
