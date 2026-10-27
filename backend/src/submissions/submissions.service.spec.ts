import { NotFoundException } from '@nestjs/common';
import { SubmissionStatus, QuestionType } from '@prisma/client';
import { Role } from '../common/enums/role.enum';
import { SubmissionsService } from './submissions.service';

describe('SubmissionsService instant results', () => {
  const actor = {
    id: 41,
    isIndependentTrial: false,
    schoolId: 7,
    role: Role.STUDENT,
    name: 'Mbale Test Student',
    email: null,
    admissionNumber: 'MBA001',
    grade: 'Grade 7',
  };

  function createService(question: Record<string, unknown>) {
    const prisma = {
      assignment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 12,
          schoolId: actor.schoolId,
          title: 'Mathematics Check',
          isPublished: true,
          publishDate: null,
          grade: actor.grade,
          targetClass: null,
          targetStream: null,
          dueDate: null,
          questions: [question],
        }),
      },
      studentProfile: {
        findUnique: jest.fn().mockResolvedValue({ className: 'Form 1', stream: 'A' }),
      },
      submission: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 91,
            ...data,
            answers: data.answers.create.map((answer: Record<string, unknown>, index: number) => ({
              id: index + 1,
              submissionId: 91,
              ...answer,
            })),
          })),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ name: actor.name, parentPhone: null }),
      },
    };
    const sms = { notifyAssignmentCompleted: jest.fn() };
    const delivery = {
      questionsForStudent: jest.fn().mockImplementation((assignment) => ({
        questions: assignment.questions,
        totalPoints: assignment.questions.reduce(
          (sum: number, item: { points: number }) => sum + item.points,
          0,
        ),
      })),
    };
    return { service: new SubmissionsService(prisma as any, sms as any, delivery as any), prisma };
  }

  it('immediately releases a fully server-graded objective assessment', async () => {
    const { service, prisma } = createService({
      id: 1,
      questionType: QuestionType.MULTIPLE_CHOICE,
      correctAnswer: '13',
      config: null,
      points: 5,
    });

    const result = await service.create(
      12,
      { answers: [{ questionId: 1, answer: '13' }], isDraft: false },
      actor,
    ) as any;

    expect(prisma.submission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: SubmissionStatus.GRADED,
          score: 5,
          resultsReleasedAt: expect.any(Date),
        }),
      }),
    );
    expect(result.score).toBe(5);
    expect(result.resultsReleasedAt).toBeInstanceOf(Date);
    expect(result.answers[0]).toEqual(expect.objectContaining({ isCorrect: true, pointsAwarded: 5 }));
  });

  it('keeps subjective work private for teacher review', async () => {
    const { service, prisma } = createService({
      id: 2,
      questionType: QuestionType.ESSAY,
      correctAnswer: null,
      config: null,
      points: 10,
    });

    const result = await service.create(
      12,
      { answers: [{ questionId: 2, answer: 'My explanation' }], isDraft: false },
      actor,
    ) as any;

    expect(prisma.submission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: SubmissionStatus.SUBMITTED,
          score: null,
          resultsReleasedAt: null,
        }),
      }),
    );
    expect(result.score).toBeNull();
    expect(result.answers[0].pointsAwarded).toBeNull();
  });

  it('rejects a student outside the assignment stream', async () => {
    const { service, prisma } = createService({
      id: 3,
      questionType: QuestionType.MULTIPLE_CHOICE,
      correctAnswer: '4',
      config: null,
      points: 1,
    });
    prisma.assignment.findUnique.mockResolvedValueOnce({
      id: 12,
      schoolId: actor.schoolId,
      title: 'Stream B Mathematics',
      isPublished: true,
      publishDate: null,
      grade: actor.grade,
      targetClass: 'Form 1',
      targetStream: 'B',
      dueDate: null,
      questions: [],
    });

    await expect(
      service.create(
        12,
        { answers: [{ questionId: 3, answer: '4' }], isDraft: false },
        actor,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.submission.create).not.toHaveBeenCalled();
  });
});
