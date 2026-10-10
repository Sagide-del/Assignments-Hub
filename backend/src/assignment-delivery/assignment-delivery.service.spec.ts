import { QuestionType } from '@prisma/client';
import { AssignmentDeliveryService } from './assignment-delivery.service';

describe('AssignmentDeliveryService', () => {
  const questions = [
    { id: 1, points: 1, questionType: QuestionType.MULTIPLE_CHOICE, options: ['A', 'B', 'C'] },
    { id: 2, points: 1, questionType: QuestionType.MULTIPLE_CHOICE, options: ['D', 'E', 'F'] },
    { id: 3, points: 1, questionType: QuestionType.TRUE_FALSE, options: null },
  ];
  const assignment = {
    id: 20,
    schoolId: 4,
    questions,
    deliveryConfig: { enabled: true, questionCount: 2, shuffleOptions: true },
  };

  it('creates and returns one immutable subset for a learner', async () => {
    const prisma = {
      studentAssignmentVariant: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([{ questionIds: [1, 2] }]),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 9, ...data })),
      },
    };
    const service = new AssignmentDeliveryService(prisma as any);

    const result = await service.questionsForStudent(assignment, 31);

    expect(result.questions).toHaveLength(2);
    expect(new Set(result.questions.map((question) => question.id)).size).toBe(2);
    expect(result.totalPoints).toBe(2);
    expect(prisma.studentAssignmentVariant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        schoolId: 4,
        assignmentId: 20,
        studentId: 31,
        totalPoints: 2,
      }),
    });
  });

  it('replays the stored question and option order on every open', async () => {
    const prisma = {
      studentAssignmentVariant: {
        findUnique: jest.fn().mockResolvedValue({
          id: 9,
          questionIds: [2, 1],
          optionOrders: { '2': ['F', 'D', 'E'], '1': ['C', 'A', 'B'] },
          totalPoints: 2,
        }),
      },
    };
    const service = new AssignmentDeliveryService(prisma as any);

    const result = await service.questionsForStudent(assignment, 31);

    expect(result.questions.map((question) => question.id)).toEqual([2, 1]);
    expect(result.questions[0].options).toEqual(['F', 'D', 'E']);
    expect(result.questions[1].options).toEqual(['C', 'A', 'B']);
    expect(result.totalPoints).toBe(2);
  });
});
