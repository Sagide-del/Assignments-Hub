import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { Role } from '../common/enums/role.enum';

describe('AuthService school learner login', () => {
  const prisma = {
    school: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    refreshToken: { create: jest.fn() },
  };
  const jwtService = { sign: jest.fn(() => 'access-token') };
  const auditService = { record: jest.fn() };
  const configService = { get: jest.fn(() => '15m') };

  let service: AuthService;
  let protectedStudent: Record<string, unknown>;

  beforeAll(async () => {
    protectedStudent = {
      id: 21,
      schoolId: 7,
      role: Role.STUDENT,
      name: 'Mbale Test Student',
      email: null,
      admissionNumber: 'MBA001',
      grade: 'Grade 7',
      isActive: true,
      subscriptionExpiresAt: null,
      passwordHash: await bcrypt.hash('246810', 4),
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.school.findUnique.mockResolvedValue({ id: 7, code: 'MBALE' });
    prisma.user.findUnique.mockResolvedValue(protectedStudent);
    prisma.refreshToken.create.mockResolvedValue({ id: 1 });
    auditService.record.mockResolvedValue(undefined);
    service = new AuthService(
      prisma as never,
      jwtService as never,
      auditService as never,
      configService as never,
    );
  });

  it('requires a PIN when the school learner has a credential hash', async () => {
    await expect(
      service.loginStudent({ schoolCode: 'mbale', admissionNumber: 'MBA001' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an incorrect learner PIN with a generic auth error', async () => {
    await expect(
      service.loginStudent({ schoolCode: 'MBALE', admissionNumber: 'MBA001', pin: '111111' }),
    ).rejects.toThrow('Invalid credentials');
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login.failed', schoolId: 7 }),
    );
  });

  it('issues a session for the correct school learner PIN', async () => {
    const result = await service.loginStudent({
      schoolCode: 'mbale',
      admissionNumber: ' MBA001 ',
      pin: '246810',
    });

    expect(prisma.school.findUnique).toHaveBeenCalledWith({ where: { code: 'MBALE' } });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { schoolId_admissionNumber: { schoolId: 7, admissionNumber: 'MBA001' } },
    });
    expect(result.accessToken).toBe('access-token');
    expect(result.user.admissionNumber).toBe('MBA001');
  });

  it('keeps legacy school learners without a PIN compatible', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...protectedStudent, passwordHash: null });

    const result = await service.loginStudent({ schoolCode: 'MBALE', admissionNumber: 'MBA001' });

    expect(result.user.name).toBe('Mbale Test Student');
  });
});
