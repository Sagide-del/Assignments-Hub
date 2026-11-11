import { CmsService } from "./cms.service";
import { StudentMasteryStatus } from "@prisma/client";

describe("CmsService mastery loop", () => {
  const actor = { id: 17, schoolId: 3 } as any;

  function serviceFor(score: number, attempt: number) {
    const prisma = {
      assignment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 91,
          maxPoints: 10,
          rawJson: {
            cms_module_id: "a0000000-0000-0000-0000-000000000001",
            cms_student_id: actor.id,
            cms_mastery: true,
            cms_attempt: attempt,
          },
        }),
      },
      submission: { findFirst: jest.fn().mockResolvedValue({ score }) },
      studentMasteryProgress: {
        upsert: jest.fn().mockImplementation(({ create }) =>
          Promise.resolve({
            attemptCount: create.attemptCount,
            bestScore: create.bestScore,
            masteryStatus: create.masteryStatus,
          }),
        ),
      },
    };
    return { service: new CmsService(prisma as any, {} as any), prisma };
  }

  it("locks the answer review after a below-EE first attempt", async () => {
    const { service, prisma } = serviceFor(4, 1);
    const result = await service.completeLearningModule(
      "a0000000-0000-0000-0000-000000000001",
      91,
      actor,
    );

    expect(prisma.studentMasteryProgress.upsert.mock.calls[0][0].create).toMatchObject({
      masteryStatus: StudentMasteryStatus.IN_PROGRESS,
      attemptCount: 1,
    });
    expect(result.answers_unlocked).toBe(false);
    expect(result.attempts_remaining).toBe(2);
  });

  it("marks EE as mastered and unlocks the next step", async () => {
    const { service, prisma } = serviceFor(8, 2);
    const result = await service.completeLearningModule(
      "a0000000-0000-0000-0000-000000000001",
      91,
      actor,
    );

    expect(prisma.studentMasteryProgress.upsert.mock.calls[0][0].create.masteryStatus).toBe(
      StudentMasteryStatus.MASTERED,
    );
    expect(result.answers_unlocked).toBe(true);
  });

  it("suggests a foundation batch after three below-EE attempts", async () => {
    const { service, prisma } = serviceFor(3, 3);
    const result = await service.completeLearningModule(
      "a0000000-0000-0000-0000-000000000001",
      91,
      actor,
    );

    expect(prisma.studentMasteryProgress.upsert.mock.calls[0][0].create.masteryStatus).toBe(
      StudentMasteryStatus.REMEDIAL,
    );
    expect(result.foundation_recommended).toBe(true);
    expect(result.answers_unlocked).toBe(true);
  });
});
