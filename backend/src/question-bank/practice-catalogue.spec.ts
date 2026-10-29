import { PracticeService } from "./practice.service";

describe("Grade-wide practice catalogue", () => {
  it("keeps missing non-science subjects visible and scopes catalogue and pools to the profile grade", async () => {
    const prisma = {
      school: {
        findUnique: jest.fn().mockResolvedValue({ code: "INDEPENDENT" }),
      },
      curriculumScope: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { subject: "Kiswahili" },
            { subject: "Social Studies" },
            { subject: "Kiswahili" },
          ]),
      },
      questionBank: { findMany: jest.fn().mockResolvedValue([]) },
      kjseaMockAttempt: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const result = await new PracticeService(prisma as any).subjects({
      id: 1,
      schoolId: 2,
      grade: "7",
    } as any);
    expect(result.grade).toBe("Grade 7");
    expect(result.subjects).toEqual([
      { subject: "Kiswahili", count: 0, batchSize: 30 },
      { subject: "Social Studies", count: 0, batchSize: 30 },
    ]);
    expect(prisma.curriculumScope.findMany).toHaveBeenCalledWith({
      where: { grade: "Grade 7", verified: true },
      select: { subject: true },
    });
    expect(prisma.questionBank.findMany.mock.calls[0][0].where).toMatchObject({
      isGlobal: true,
      status: "APPROVED",
      grade: { in: ["Grade 7", "Grade7", "7"] },
    });
  });
  it("requires a valid supported grade before reading any curriculum or question data", async () => {
    const prisma = {
      school: {
        findUnique: jest.fn().mockResolvedValue({ code: "INDEPENDENT" }),
      },
      curriculumScope: { findMany: jest.fn() },
    };
    await expect(
      new PracticeService(prisma as any).subjects({
        schoolId: 2,
        grade: "Grade 5",
      } as any),
    ).rejects.toThrow("Grade 6–12");
    expect(prisma.curriculumScope.findMany).not.toHaveBeenCalled();
  });
});
