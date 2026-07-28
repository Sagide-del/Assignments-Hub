import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StaffLoginDto } from './dto/staff-login.dto';
import { StudentLoginDto } from './dto/student-login.dto';
import { IndependentLoginDto } from './dto/independent-login.dto';
import { RegisterIndependentStudentDto } from './dto/register-independent-student.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { Role } from '../common/enums/role.enum';
import { normalizeGrade } from '../common/utils/grade.util';
import { generateIndependentStudentId } from '../common/utils/independent-student-id.util';

// How long a refresh token is valid for if it's never used to refresh
// (i.e. how long a "remember me" session can sit idle before the user has
// to log in again). Each successful refresh issues a new one with a fresh
// window, so an active user is never forced to re-login mid-session.
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const INDEPENDENT_SCHOOL_CODE = 'INDEPENDENT';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async loginStaff(dto: StaffLoginDto, ipAddress?: string) {
    const school = await this.prisma.school.findUnique({ where: { code: dto.schoolCode } });

    // Deliberately generic error for unknown school / email / bad password,
    // so responses can't be used to enumerate valid schools or accounts.
    const invalidCredentials = () => new UnauthorizedException('Invalid credentials');

    if (!school) throw invalidCredentials();

    const user = await this.prisma.user.findUnique({
      where: { schoolId_email: { schoolId: school.id, email: dto.email } },
    });

    if (!user || !user.isActive || !user.passwordHash) throw invalidCredentials();
    if (user.role === Role.STUDENT) throw invalidCredentials();

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      await this.auditService.record({
        action: 'auth.login.failed',
        schoolId: school.id,
        resource: `User:${user.id}`,
        ipAddress,
      });
      throw invalidCredentials();
    }

    await this.auditService.record({
      action: 'auth.login',
      userId: user.id,
      schoolId: school.id,
      ipAddress,
    });

    return this.issueTokenPair(
      {
        id: user.id,
        schoolId: user.schoolId,
        role: user.role as Role,
        name: user.name,
        email: user.email,
        admissionNumber: user.admissionNumber,
        grade: user.grade,
      },
      ipAddress,
    );
  }

  async loginStudent(dto: StudentLoginDto, ipAddress?: string) {
    const school = await this.prisma.school.findUnique({ where: { code: dto.schoolCode } });
    const invalidCredentials = () => new UnauthorizedException('Invalid credentials');

    if (!school) throw invalidCredentials();

    const user = await this.prisma.user.findUnique({
      where: {
        schoolId_admissionNumber: {
          schoolId: school.id,
          admissionNumber: dto.admissionNumber,
        },
      },
    });

    if (!user || !user.isActive || user.role !== Role.STUDENT) throw invalidCredentials();

    // Self-registered independent accounts always carry a password and must
    // use the dedicated login endpoint. Legacy admin-created independent
    // accounts have no password and retain their existing admission-number
    // login so this rollout remains backward compatible.
    if (school.code === INDEPENDENT_SCHOOL_CODE && user.passwordHash) {
      throw invalidCredentials();
    }

    // Independent students (enrolled without a school — see
    // backend/src/independent-students) carry their own paid-through date
    // instead of riding on a school's subscription. Regular
    // school-affiliated students never have this set, so this is a no-op
    // for them. Specific message rather than the generic one above: this
    // is an expected, non-adversarial account state, not a login guess.
    if (user.subscriptionExpiresAt && user.subscriptionExpiresAt < new Date()) {
      throw new UnauthorizedException('Your subscription has expired. Please contact support to renew your access.');
    }

    await this.auditService.record({
      action: 'auth.login',
      userId: user.id,
      schoolId: school.id,
      ipAddress,
    });

    return this.issueTokenPair(
      {
        id: user.id,
        schoolId: user.schoolId,
        role: user.role as Role,
        name: user.name,
        email: user.email,
        admissionNumber: user.admissionNumber,
        grade: user.grade,
      },
      ipAddress,
    );
  }

  async registerIndependentStudent(dto: RegisterIndependentStudentDto, ipAddress?: string) {
    const email = dto.email?.trim().toLowerCase() || undefined;
    const school = await this.prisma.school.upsert({
      where: { code: INDEPENDENT_SCHOOL_CODE },
      create: {
        name: 'Independent Students',
        code: INDEPENDENT_SCHOOL_CODE,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
      },
      update: {},
    });

    if (email) {
      const existing = await this.prisma.user.findUnique({
        where: { schoolId_email: { schoolId: school.id, email } },
      });
      if (existing) {
        throw new ConflictException('An individual student account already exists for this email');
      }
    }

    const grade = normalizeGrade(dto.grade) ?? dto.grade.trim();
    const admissionNumber = await generateIndependentStudentId(this.prisma, school.id);
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const student = await this.prisma.user.create({
      data: {
        schoolId: school.id,
        name: dto.name.trim(),
        email,
        passwordHash,
        admissionNumber,
        grade,
        parentPhone: dto.parentPhone?.trim() || undefined,
        role: Role.STUDENT,
        // Payment approval activates the account and establishes its first
        // paid-through date. An unverified claim must never grant access.
        isActive: false,
        studentProfile: {
          create: {
            admissionNumber,
            grade,
            parentPhone: dto.parentPhone?.trim() || undefined,
          },
        },
      },
    });

    await this.auditService.record({
      action: 'auth.independent_student.register',
      userId: student.id,
      schoolId: school.id,
      resource: `User:${student.id}`,
      ipAddress,
    });

    return {
      studentId: student.id,
      name: student.name,
      email: student.email,
      admissionNumber: student.admissionNumber,
      grade: student.grade,
      requiresPayment: true,
    };
  }

  async loginIndependentStudent(dto: IndependentLoginDto, ipAddress?: string) {
    const invalidCredentials = () => new UnauthorizedException('Invalid credentials');
    const school = await this.prisma.school.findUnique({ where: { code: INDEPENDENT_SCHOOL_CODE } });
    if (!school) throw invalidCredentials();

    const identifier = dto.identifier.trim();
    const user = await this.prisma.user.findFirst({
      where: {
        schoolId: school.id,
        role: Role.STUDENT,
        OR: [
          { admissionNumber: identifier.toUpperCase() },
          { email: identifier.toLowerCase() },
        ],
      },
    });

    if (!user || user.role !== Role.STUDENT || !user.passwordHash) throw invalidCredentials();
    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) throw invalidCredentials();

    if (!user.isActive || !user.subscriptionExpiresAt) {
      throw new UnauthorizedException('Your payment is awaiting verification');
    }
    if (user.subscriptionExpiresAt < new Date()) {
      throw new UnauthorizedException('Your subscription has expired. Please renew your access.');
    }

    await this.auditService.record({
      action: 'auth.login',
      userId: user.id,
      schoolId: school.id,
      ipAddress,
    });

    return this.issueTokenPair(
      {
        id: user.id,
        schoolId: user.schoolId,
        role: user.role as Role,
        name: user.name,
        email: user.email,
        admissionNumber: user.admissionNumber,
        grade: user.grade,
      },
      ipAddress,
    );
  }

  /**
   * Exchanges a valid, unexpired refresh token for a new access/refresh
   * pair (rotation: the old refresh token is revoked in the same call, so
   * each one is single-use). If the presented token has already been
   * rotated out (replacedByTokenHash is set) — meaning someone is replaying
   * a refresh token that shouldn't exist anymore — that's treated as a
   * possible theft signal and every refresh token for that user is revoked,
   * forcing a fresh login everywhere.
   */
  async refresh(refreshTokenPlain: string, ipAddress?: string) {
    const invalid = () => new UnauthorizedException('Invalid or expired session, please log in again');
    const tokenHash = this.hashToken(refreshTokenPlain);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) throw invalid();

    if (stored.revokedAt) {
      // Reuse of an already-rotated-out (or already-logged-out) token.
      // Assume compromise and kill every session for this user.
      await this.revokeAllForUser(stored.userId);
      await this.auditService.record({
        action: 'auth.refresh_token.reuse_detected',
        userId: stored.userId,
        schoolId: stored.user.schoolId,
        ipAddress,
      });
      throw invalid();
    }

    if (stored.expiresAt.getTime() < Date.now()) throw invalid();
    if (!stored.user.isActive) throw invalid();
    // Same independent-student expiry check as loginStudent — a session
    // shouldn't be able to outlive a lapsed subscription just by refreshing.
    if (stored.user.subscriptionExpiresAt && stored.user.subscriptionExpiresAt < new Date()) throw invalid();

    const user: AuthenticatedUser = {
      id: stored.user.id,
      schoolId: stored.user.schoolId,
      role: stored.user.role as Role,
      name: stored.user.name,
      email: stored.user.email,
      admissionNumber: stored.user.admissionNumber,
      grade: stored.user.grade,
    };

    const pair = await this.issueTokenPair(user, ipAddress);

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedByTokenHash: this.hashToken(pair.refreshToken) },
    });

    return pair;
  }

  /** Revokes a single refresh token (normal "Log out on this device"). */
  async logout(refreshTokenPlain: string) {
    const tokenHash = this.hashToken(refreshTokenPlain);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeAllForUser(userId: number) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async issueTokenPair(user: AuthenticatedUser, ipAddress?: string) {
    const payload: JwtPayload = { sub: user.id, schoolId: user.schoolId, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    const refreshTokenPlain = crypto.randomBytes(48).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshTokenPlain),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        createdByIp: ipAddress,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenPlain,
      // How long the ACCESS token lives, in seconds — lets the frontend
      // schedule a proactive silent refresh shortly before it expires
      // instead of waiting for a request to 401 first.
      expiresIn: this.accessTokenTtlSeconds(),
      user,
    };
  }

  private accessTokenTtlSeconds(): number {
    const raw = this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
    const match = /^(\d+)([smhd])$/.exec(raw.trim());
    if (!match) return 15 * 60;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[unit] ?? 60;
    return value * multiplier;
  }
}
