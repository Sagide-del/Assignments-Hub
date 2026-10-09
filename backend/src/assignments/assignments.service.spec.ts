import { NotFoundException } from '@nestjs/common';
import { Role } from '../common/enums/role.enum';
import { AssignmentsService } from './assignments.service';
import { AssignmentKind } from '@prisma/client';

describe('AssignmentsService academic scoping', () => {
  function createService() {
    const prisma = {
      studentProfile: { findUnique: jest.fn() },
      assignment: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
    };
    const sms = { getStudentRecipients: jest.fn(), notifyNewAssignment: jest.fn() };
    return { service: new AssignmentsService(prisma as any, sms as any), prisma };
  }

  it('limits a teacher assignment list to assignments they created', async () => {
    const { service, prisma } = createService();
    await service.findAll({ id: 31, schoolId: 8, role: Role.TEACHER } as any);

    expect(prisma.assignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ schoolId: 8, createdById: 31 }),
      }),
    );
  });

  it('uses the student profile to scope the assignment catalogue', async () => {
    const { service, prisma } = createService();
    prisma.studentProfile.findUnique.mockResolvedValue({ className: 'Form 1', stream: 'East' });

    await service.findAll({ id: 42, schoolId: 8, role: Role.STUDENT, grade: 'Grade 7' } as any);

    expect(prisma.assignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId: 8,
          grade: 'Grade 7',
          kind: AssignmentKind.STANDARD,
          isPublished: true,
          AND: [
            { OR: [{ targetClass: null }, { targetClass: 'Form 1' }] },
            { OR: [{ targetStream: null }, { targetStream: 'East' }] },
          ],
        }),
      }),
    );
  });

  it('keeps KCSE papers in the dedicated student catalogue', async () => {
    const { service, prisma } = createService();
    prisma.studentProfile.findUnique.mockResolvedValue({ className: 'Form 4', stream: 'A' });

    await service.findKcse({ id: 42, schoolId: 8, role: Role.STUDENT, grade: 'Grade 12' } as any);

    expect(prisma.assignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId: 8,
          grade: 'Grade 12',
          kind: AssignmentKind.KCSE_PAPER,
          isPublished: true,
        }),
      }),
    );
  });

  it('does not expose another teacher assignment by direct id', async () => {
    const { service, prisma } = createService();
    prisma.assignment.findUnique.mockResolvedValue({
      id: 15,
      schoolId: 8,
      createdById: 99,
      questions: [],
      sections: [],
      rubric: null,
    });

    await expect(
      service.findOne(15, { id: 31, schoolId: 8, role: Role.TEACHER } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
