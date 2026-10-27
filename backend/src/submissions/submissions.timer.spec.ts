import { BadRequestException, ConflictException } from "@nestjs/common";
import { Role } from "../common/enums/role.enum";
import { SubmissionsService } from "./submissions.service";
describe("Persisted assignment countdown and draft updates", () => {
  const actor = {
    id: 41,
    schoolId: 7,
    role: Role.STUDENT,
    name: "Learner",
    grade: "Grade 11",
    email: null,
    admissionNumber: null,
    isIndependentTrial: false,
  };
  function setup(ageSeconds = 70) {
    const question = {
      id: 1,
      questionType: "MULTIPLE_CHOICE",
      questionText: "Choose 13.",
      correctAnswer: "13",
      points: 5,
      config: null,
    };
    const existing: any = {
      id: 91,
      assignmentId: 12,
      studentId: 41,
      status: "DRAFT",
      startedAt: new Date(Date.now() - ageSeconds * 1000),
      answers: [{ questionId: 1, studentAnswer: "13" }],
    };
    const assignment = {
      id: 12,
      schoolId: 7,
      title: "The Mole",
      isPublished: true,
      grade: "Grade 11",
      timeAllowedMinutes: 1,
      questions: [question],
    };
    const prisma = {
      assignment: { findUnique: jest.fn().mockResolvedValue(assignment) },
      studentProfile: { findUnique: jest.fn().mockResolvedValue({}) },
      submission: {
        findFirst: jest.fn().mockResolvedValue(existing),
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({
              ...existing,
              ...data,
              answers: data.answers.create,
            }),
          ),
      },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ name: "Learner", parentPhone: null }),
      },
    };
    const service = new SubmissionsService(
      prisma as any,
      {} as any,
      {
        questionsForStudent: async () => ({
          questions: [question],
          totalPoints: 5,
        }),
      } as any,
    );
    return { service, prisma, existing, assignment };
  }
  it("rejects draft edits after the persisted deadline without resetting the start", async () => {
    const { service, prisma } = setup();
    await expect(
      service.create(
        12,
        { isDraft: true, answers: [{ questionId: 1, answer: "wrong" }] },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.submission.update).not.toHaveBeenCalled();
  });
  it("grades the last saved answers, not a late payload, when an expired attempt is submitted", async () => {
    const { service, prisma, existing } = setup();
    const result = await service.create(
      12,
      {
        isDraft: false,
        timeSpentSeconds: 0,
        answers: [{ questionId: 1, answer: "wrong" }],
      },
      actor,
    );
    expect(result.score).toBe(5);
    expect(prisma.submission.update.mock.calls[0][0]).toMatchObject({
      where: { id: 91, status: "DRAFT" },
      data: {
        startedAt: existing.startedAt,
        timeSpentSeconds: 60,
        answers: {
          deleteMany: {},
          create: [{ questionId: 1, studentAnswer: "13" }],
        },
      },
    });
    expect(Number.isFinite(Date.parse((result as any).serverNow))).toBe(true);
  });
  it("saves before expiry atomically and derives elapsed time from the persisted start", async () => {
    const { service, prisma, existing } = setup(10);
    await service.create(
      12,
      {
        isDraft: true,
        timeSpentSeconds: 999999,
        answers: [{ questionId: 1, answer: "new working" }],
      },
      actor,
    );
    const call = prisma.submission.update.mock.calls[0][0];
    expect(call.data.startedAt).toBe(existing.startedAt);
    expect(call.data.timeSpentSeconds).toBeGreaterThanOrEqual(10);
    expect(call.data.timeSpentSeconds).toBeLessThan(15);
    expect(call.data.answers).toMatchObject({
      deleteMany: {},
      create: [
        { questionId: 1, studentAnswer: "new working", pointsAwarded: null },
      ],
    });
  });
  it("requires a persisted start before finalising a timed exam", async () => {
    const { service, prisma } = setup();
    prisma.submission.findFirst.mockResolvedValue(null);
    await expect(
      service.create(12, { isDraft: false, answers: [] }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.submission.update).not.toHaveBeenCalled();
  });
  it("cannot reopen a final attempt through the draft endpoint", async () => {
    const { service, existing, prisma } = setup();
    existing.status = "SUBMITTED";
    await expect(
      service.create(12, { isDraft: true, answers: [] }, actor),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.submission.update).not.toHaveBeenCalled();
  });
});
