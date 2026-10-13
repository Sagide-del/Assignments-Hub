import { ForbiddenException } from '@nestjs/common';
import { PresenceDeviceType, Role } from '@prisma/client';

import { PresenceService } from './presence.service';

describe('PresenceService', () => {
  const actor = {
    id: 12,
    schoolId: 7,
    role: Role.STUDENT,
    name: 'Test Learner',
    email: null,
    admissionNumber: 'MBA001',
    grade: 'Grade 7',
  };

  function setup() {
    const prisma = {
      userPresenceSession: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    return { prisma, service: new PresenceService(prisma as never) };
  }

  it('derives tenant and user identity from the authenticated actor', async () => {
    const { prisma, service } = setup();
    prisma.userPresenceSession.findUnique.mockResolvedValue(null);
    prisma.userPresenceSession.upsert.mockResolvedValue({ lastSeenAt: new Date() });

    await service.heartbeat({
      sessionId: '94828236-8df3-4ba4-b769-306aac2bc701',
      currentPath: '/student/my-assignments/42?review=true',
      deviceType: PresenceDeviceType.MOBILE,
    }, actor);

    expect(prisma.userPresenceSession.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        userId: actor.id,
        schoolId: actor.schoolId,
        currentPath: '/student/my-assignments/:id',
      }),
    }));
  });

  it('rejects reuse of another user session id', async () => {
    const { prisma, service } = setup();
    prisma.userPresenceSession.findUnique.mockResolvedValue({ userId: 999 });

    await expect(service.heartbeat({
      sessionId: '94828236-8df3-4ba4-b769-306aac2bc701',
      currentPath: '/student/my-assignments',
      deviceType: PresenceDeviceType.MOBILE,
    }, actor)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.userPresenceSession.upsert).not.toHaveBeenCalled();
  });
});
