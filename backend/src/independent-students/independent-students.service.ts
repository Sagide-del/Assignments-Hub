import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import {
  IndependentPaymentClaimStatus,
  SmsType,
  SubmissionStatus,
  SubscriptionInterval,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateIndependentStudentDto } from './dto/create-independent-student.dto';
import { RecordIndependentInvoiceDto } from './dto/record-invoice.dto';
import { SubmitIndependentPaymentClaimDto } from './dto/submit-payment-claim.dto';
import { RejectIndependentPaymentClaimDto } from './dto/reject-payment-claim.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../common/enums/role.enum';
import { generateIndependentStudentId } from '../common/utils/independent-student-id.util';
import { SmsService } from '../sms/sms.service';
import { SendIndependentWelcomeDto } from './dto/send-independent-welcome.dto';

// The one system-wide School row every independent student belongs to —
// lazily upserted by code so the rest of the app's schoolId-scoped
// machinery (assignments, labs, TenantGuard, branding, etc.) keeps working
// completely unmodified for them. It shows up in the platform admin's
// regular Schools list like any other school (with no real subscription
// revenue against it) — that's expected, not a bug.
const INDEPENDENT_SCHOOL_CODE = 'INDEPENDENT';

@Injectable()
export class IndependentStudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly smsService: SmsService,
  ) {}

  private async getOrCreateSchool() {
    return this.prisma.school.upsert({
      where: { code: INDEPENDENT_SCHOOL_CODE },
      create: {
        name: 'Independent Students',
        code: INDEPENDENT_SCHOOL_CODE,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
      },
      update: {},
    });
  }

  // Static M-Pesa Till Number payment details shown to the admin (and, via
  // them, to the parent/student) — not a live payment-gateway integration,
  // just where to send the money before its confirmation code gets
  // recorded here. Env-overridable the same way EQUITY_PAYBILL_NUMBER is.
  getPaymentInfo() {
    const tillNumber = this.configService.get<string>('INDEPENDENT_MPESA_TILL_NUMBER')?.trim() || '';
    const storeNumber = this.configService.get<string>('INDEPENDENT_MPESA_STORE_NUMBER')?.trim() || '';
    const monthlyAmountKES = this.readPositiveAmount('INDEPENDENT_MONTHLY_PRICE_KES');
    const annualAmountKES = this.readPositiveAmount('INDEPENDENT_ANNUAL_PRICE_KES');

    return {
      enabled: Boolean(tillNumber && monthlyAmountKES),
      tillNumber,
      storeNumber,
      monthlyAmountKES,
      annualAmountKES,
      instructions:
        this.configService.get<string>('INDEPENDENT_MPESA_INSTRUCTIONS')?.trim() ||
        'Pay via M-Pesa Buy Goods, then submit the confirmation code for verification.',
    };
  }

  async findStudents() {
    const school = await this.getOrCreateSchool();
    const students = await this.prisma.user.findMany({
      where: { schoolId: school.id, role: Role.STUDENT },
      select: {
        id: true,
        name: true,
        email: true,
        admissionNumber: true,
        grade: true,
        parentPhone: true,
        passwordHash: true,
        isActive: true,
        subscriptionExpiresAt: true,
        createdAt: true,
        independentInvoices: {
          select: { amountKES: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const now = new Date();
    return students.map((student) => {
      const totalPaidKES = student.independentInvoices.reduce(
        (total, invoice) => total + invoice.amountKES,
        0,
      );

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        admissionNumber: student.admissionNumber,
        grade: student.grade,
        parentPhone: student.parentPhone,
        isActive: student.isActive,
        hasPassword: Boolean(student.passwordHash),
        subscriptionExpiresAt: student.subscriptionExpiresAt,
        createdAt: student.createdAt,
        paymentCount: student.independentInvoices.length,
        totalPaidKES,
        lastPaymentAt: student.independentInvoices[0]?.createdAt ?? null,
        status: !student.subscriptionExpiresAt
          ? 'NEVER_PAID'
          : student.subscriptionExpiresAt > now
            ? 'ACTIVE'
            : 'EXPIRED',
      };
    });
  }

  async getSummary() {
    const school = await this.getOrCreateSchool();
    const now = new Date();

    const [students, invoiceSummary, pendingPayments] = await Promise.all([
      this.prisma.user.findMany({
        where: { schoolId: school.id, role: Role.STUDENT },
        select: {
          isActive: true,
          parentPhone: true,
          passwordHash: true,
          subscriptionExpiresAt: true,
        },
      }),
      this.prisma.independentStudentInvoice.aggregate({
        where: { student: { schoolId: school.id, role: Role.STUDENT } },
        _count: { _all: true },
        _sum: { amountKES: true },
      }),
      this.prisma.independentPaymentClaim.count({
        where: {
          student: { schoolId: school.id, role: Role.STUDENT },
          status: IndependentPaymentClaimStatus.AWAITING_VERIFICATION,
        },
      }),
    ]);

    const activeStudents = students.filter(
      (student) =>
        student.isActive &&
        student.subscriptionExpiresAt &&
        student.subscriptionExpiresAt > now,
    ).length;

    return {
      totalPopulation: students.length,
      activeStudents,
      expiredStudents: students.filter(
        (student) => student.subscriptionExpiresAt && student.subscriptionExpiresAt <= now,
      ).length,
      neverPaidStudents: students.filter((student) => !student.subscriptionExpiresAt).length,
      studentsWithPhone: students.filter((student) => Boolean(student.parentPhone)).length,
      loginReadyStudents: students.filter((student) => Boolean(student.passwordHash)).length,
      paymentsMade: invoiceSummary._count._all,
      totalRevenueKES: invoiceSummary._sum.amountKES ?? 0,
      pendingPayments,
    };
  }

  async getTutorOverview() {
    const school = await this.getOrCreateSchool();

    const [
      totalStudents,
      totalAssignments,
      totalSubmissions,
      pendingReview,
      autoGraded,
      tutorReviewed,
      labCompletions,
      publishedMnemonicCards,
      recentLabSessions,
    ] = await Promise.all([
      this.prisma.user.count({ where: { schoolId: school.id, role: Role.STUDENT } }),
      this.prisma.assignment.count({ where: { schoolId: school.id } }),
      this.prisma.submission.count({
        where: {
          assignment: { schoolId: school.id },
          status: { not: SubmissionStatus.DRAFT },
        },
      }),
      this.prisma.submission.count({
        where: {
          assignment: { schoolId: school.id },
          status: SubmissionStatus.SUBMITTED,
        },
      }),
      this.prisma.submission.count({
        where: {
          assignment: { schoolId: school.id },
          status: SubmissionStatus.GRADED,
          gradedById: null,
        },
      }),
      this.prisma.submission.count({
        where: {
          assignment: { schoolId: school.id },
          status: SubmissionStatus.GRADED,
          gradedById: { not: null },
        },
      }),
      this.prisma.labSession.count({ where: { schoolId: school.id } }),
      this.prisma.mnemonicCard.count({ where: { isPublished: true } }),
      this.prisma.labSession.findMany({
        where: { schoolId: school.id },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              grade: true,
              admissionNumber: true,
            },
          },
        },
        orderBy: { completedAt: 'desc' },
        take: 50,
      }),
    ]);

    const labKeys = Array.from(new Set(recentLabSessions.map((session) => session.labKey)));
    const labs = labKeys.length
      ? await this.prisma.lab.findMany({
          where: { key: { in: labKeys } },
          select: { key: true, title: true, subject: true, topic: true, grade: true },
        })
      : [];
    const labByKey = new Map(labs.map((lab) => [lab.key, lab]));

    return {
      summary: {
        totalStudents,
        totalAssignments,
        totalSubmissions,
        pendingReview,
        autoGraded,
        tutorReviewed,
        labCompletions,
        publishedMnemonicCards,
      },
      recentLabSessions: recentLabSessions.map((session) => ({
        ...session,
        lab: labByKey.get(session.labKey) ?? null,
      })),
    };
  }

  async getTutorSubmissions(filters: {
    studentId?: number;
    subject?: string;
    reviewState?: string;
  }) {
    const school = await this.getOrCreateSchool();
    const reviewWhere =
      filters.reviewState === 'PENDING'
        ? { status: SubmissionStatus.SUBMITTED }
        : filters.reviewState === 'AUTO_GRADED'
          ? { status: SubmissionStatus.GRADED, gradedById: null }
          : filters.reviewState === 'TUTOR_REVIEWED'
            ? { status: SubmissionStatus.GRADED, gradedById: { not: null } }
            : { status: { not: SubmissionStatus.DRAFT } };

    return this.prisma.submission.findMany({
      where: {
        ...reviewWhere,
        studentId: filters.studentId,
        assignment: {
          schoolId: school.id,
          ...(filters.subject?.trim()
            ? { subject: { equals: filters.subject.trim(), mode: 'insensitive' } }
            : {}),
        },
      },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            subject: true,
            grade: true,
            type: true,
            maxPoints: true,
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            grade: true,
            admissionNumber: true,
          },
        },
        gradedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  async createStudent(dto: CreateIndependentStudentDto, actor: AuthenticatedUser) {
    const school = await this.getOrCreateSchool();

    // Independent students don't come from a school register, so there's
    // no natural admission number — generate one if the admin didn't
    // supply one, unique enough within this one school.
    const admissionNumber =
      dto.admissionNumber?.trim().toUpperCase() ||
      await generateIndependentStudentId(this.prisma, school.id);

    return this.usersService.create(
      {
        name: dto.name,
        role: Role.STUDENT,
        schoolId: school.id,
        admissionNumber,
        grade: dto.grade,
        parentPhone: dto.parentPhone,
      },
      actor,
    );
  }

  async deleteStudents(studentIds: number[]) {
    const school = await this.getOrCreateSchool();
    return this.prisma.$transaction(async (transaction) => {
      const students = await transaction.user.findMany({
        where: {
          id: { in: studentIds },
          schoolId: school.id,
          role: Role.STUDENT,
        },
        select: { id: true },
      });

      if (students.length !== studentIds.length) {
        throw new BadRequestException(
          'One or more selected accounts are not independent students',
        );
      }

      const deleted = await transaction.user.deleteMany({
        where: {
          id: { in: studentIds },
          schoolId: school.id,
          role: Role.STUDENT,
        },
      });
      if (deleted.count !== studentIds.length) {
        throw new ConflictException('The student list changed; refresh and try again');
      }

      return { deleted: deleted.count, ids: studentIds };
    });
  }

  async sendWelcome(
    studentId: number,
    dto: SendIndependentWelcomeDto,
    actor: AuthenticatedUser,
  ) {
    const school = await this.getOrCreateSchool();
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: { studentProfile: true },
    });

    if (!student || student.schoolId !== school.id || student.role !== Role.STUDENT) {
      throw new NotFoundException('Independent student not found');
    }

    if (
      !student.isActive ||
      !student.subscriptionExpiresAt ||
      student.subscriptionExpiresAt <= new Date()
    ) {
      throw new ForbiddenException(
        'Activate the student subscription before sending login credentials',
      );
    }

    const phone =
      dto.phone?.trim() ||
      student.parentPhone?.trim() ||
      student.studentProfile?.parentPhone?.trim();
    if (!phone) {
      throw new BadRequestException('Add a parent or guardian phone number first');
    }
    if (!student.admissionNumber) {
      throw new ConflictException('This student does not have a login ID');
    }

    const temporaryPassword = this.createTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    const customMessage =
      dto.message?.trim() || `Welcome to Assignment Hub, ${student.name}.`;
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL')?.trim().replace(/\/$/, '') ||
      'https://assignmenthub.co.ke';
    const message = [
      customMessage,
      `Login ID: ${student.admissionNumber}`,
      `Temporary password: ${temporaryPassword}`,
      `Sign in: ${frontendUrl}/login`,
    ].join('\n');
    const loggedMessage = [
      customMessage,
      `Login ID: ${student.admissionNumber}`,
      'Temporary password: [REDACTED]',
      `Sign in: ${frontendUrl}/login`,
    ].join('\n');

    await this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: student.id },
        data: {
          passwordHash,
          parentPhone: phone,
        },
      });
      await transaction.studentProfile.upsert({
        where: { userId: student.id },
        create: {
          userId: student.id,
          admissionNumber: student.admissionNumber,
          grade: student.grade,
          parentPhone: phone,
        },
        update: { parentPhone: phone },
      });
    });

    const delivery = await this.smsService.sendAndLog({
      schoolId: school.id,
      type: SmsType.BROADCAST,
      message,
      loggedMessage,
      recipients: [{ phone, studentId: student.id }],
      sentById: actor.id,
    });

    return {
      studentId: student.id,
      name: student.name,
      loginId: student.admissionNumber,
      temporaryPassword,
      phone,
      delivery,
    };
  }

  async findInvoices(studentId?: number) {
    const school = await this.getOrCreateSchool();
    return this.prisma.independentStudentInvoice.findMany({
      where: studentId ? { studentId } : { student: { schoolId: school.id } },
      include: { student: { select: { id: true, name: true } }, recordedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteInvoice(invoiceId: number) {
    const school = await this.getOrCreateSchool();

    return this.prisma.$transaction(async (transaction) => {
      const invoice = await transaction.independentStudentInvoice.findUnique({
        where: { id: invoiceId },
        include: {
          student: {
            select: {
              id: true,
              schoolId: true,
              role: true,
            },
          },
        },
      });
      if (
        !invoice ||
        invoice.student.schoolId !== school.id ||
        invoice.student.role !== Role.STUDENT
      ) {
        throw new NotFoundException('Independent student payment not found');
      }

      await transaction.independentStudentInvoice.delete({ where: { id: invoice.id } });
      const remaining = await transaction.independentStudentInvoice.aggregate({
        where: { studentId: invoice.studentId },
        _max: { periodEnd: true },
      });
      const subscriptionExpiresAt = remaining._max.periodEnd;

      await transaction.user.update({
        where: { id: invoice.studentId },
        data: {
          subscriptionExpiresAt,
          isActive: Boolean(subscriptionExpiresAt && subscriptionExpiresAt > new Date()),
        },
      });

      return {
        id: invoice.id,
        studentId: invoice.studentId,
        subscriptionExpiresAt,
      };
    });
  }

  async submitPaymentClaim(dto: SubmitIndependentPaymentClaimDto) {
    const paymentInfo = this.getPaymentInfo();
    if (!paymentInfo.enabled) {
      throw new ServiceUnavailableException('Individual student payments are not configured yet');
    }

    const school = await this.getOrCreateSchool();
    const identifier = dto.identifier.trim();
    const student = await this.prisma.user.findFirst({
      where: {
        schoolId: school.id,
        role: Role.STUDENT,
        OR: [
          { admissionNumber: identifier.toUpperCase() },
          { email: identifier.toLowerCase() },
        ],
      },
    });
    if (!student || student.role !== Role.STUDENT || !student.passwordHash) {
      throw new NotFoundException('Individual student account not found');
    }

    const interval = this.normalizeInterval(dto.interval);
    const existingPending = await this.prisma.independentPaymentClaim.findFirst({
      where: {
        studentId: student.id,
        interval,
        status: IndependentPaymentClaimStatus.AWAITING_VERIFICATION,
      },
    });
    if (existingPending) {
      throw new ConflictException('A payment claim for this subscription is already awaiting verification');
    }

    const mpesaCode = dto.mpesaCode.trim().toUpperCase();
    const duplicateCode = await this.prisma.independentPaymentClaim.findUnique({ where: { mpesaCode } });
    if (duplicateCode) {
      throw new ConflictException('This M-Pesa confirmation code has already been submitted');
    }

    const amountKES =
      interval === SubscriptionInterval.ANNUAL
        ? paymentInfo.annualAmountKES
        : paymentInfo.monthlyAmountKES;
    if (!amountKES) {
      throw new ServiceUnavailableException('The selected subscription interval is not configured');
    }

    const claim = await this.prisma.independentPaymentClaim.create({
      data: {
        studentId: student.id,
        amountKES,
        interval,
        mpesaCode,
        payerPhone: dto.payerPhone?.trim() || undefined,
      },
    });

    return {
      id: claim.id,
      status: claim.status,
      amountKES: claim.amountKES,
      interval: claim.interval,
      createdAt: claim.createdAt,
    };
  }

  async findPaymentClaims() {
    const school = await this.getOrCreateSchool();
    return this.prisma.independentPaymentClaim.findMany({
      where: { student: { schoolId: school.id } },
      include: {
        student: { select: { id: true, name: true, email: true, grade: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approvePaymentClaim(id: number, actor: AuthenticatedUser) {
    const school = await this.getOrCreateSchool();
    const claim = await this.prisma.independentPaymentClaim.findUnique({
      where: { id },
      include: { student: true },
    });
    if (!claim || claim.student.schoolId !== school.id || claim.student.role !== Role.STUDENT) {
      throw new NotFoundException('Payment claim not found');
    }
    if (claim.status !== IndependentPaymentClaimStatus.AWAITING_VERIFICATION) {
      throw new ConflictException('This payment claim has already been reviewed');
    }

    const now = new Date();
    const periodStart =
      claim.student.subscriptionExpiresAt && claim.student.subscriptionExpiresAt > now
        ? claim.student.subscriptionExpiresAt
        : now;
    const periodEnd = this.calculatePeriodEnd(periodStart, claim.interval);

    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.independentPaymentClaim.updateMany({
        where: { id, status: IndependentPaymentClaimStatus.AWAITING_VERIFICATION },
        data: {
          status: IndependentPaymentClaimStatus.CONFIRMED,
          reviewedById: actor.id,
          reviewedAt: now,
          rejectionReason: null,
        },
      });
      if (locked.count !== 1) {
        throw new ConflictException('This payment claim has already been reviewed');
      }

      const invoice = await tx.independentStudentInvoice.create({
        data: {
          studentId: claim.student.id,
          invoiceNumber: this.createInvoiceNumber(claim.student.id),
          studentName: claim.student.name,
          amountKES: claim.amountKES,
          interval: claim.interval,
          periodStart,
          periodEnd,
          mpesaCode: claim.mpesaCode,
          payerPhone: claim.payerPhone,
          recordedById: actor.id,
        },
      });

      await tx.user.update({
        where: { id: claim.student.id },
        data: { subscriptionExpiresAt: periodEnd, isActive: true },
      });

      return {
        id: claim.id,
        status: IndependentPaymentClaimStatus.CONFIRMED,
        reviewedAt: now,
        invoice,
      };
    });
  }

  async rejectPaymentClaim(id: number, dto: RejectIndependentPaymentClaimDto, actor: AuthenticatedUser) {
    const school = await this.getOrCreateSchool();
    const claim = await this.prisma.independentPaymentClaim.findUnique({
      where: { id },
      include: { student: { select: { schoolId: true } } },
    });
    if (!claim || claim.student.schoolId !== school.id) {
      throw new NotFoundException('Payment claim not found');
    }
    if (claim.status !== IndependentPaymentClaimStatus.AWAITING_VERIFICATION) {
      throw new ConflictException('This payment claim has already been reviewed');
    }

    return this.prisma.independentPaymentClaim.update({
      where: { id },
      data: {
        status: IndependentPaymentClaimStatus.REJECTED,
        reviewedById: actor.id,
        reviewedAt: new Date(),
        rejectionReason: dto.reason?.trim() || undefined,
      },
      include: { student: { select: { id: true, name: true, email: true } } },
    });
  }

  async recordInvoice(dto: RecordIndependentInvoiceDto, actor: AuthenticatedUser) {
    const school = await this.getOrCreateSchool();
    const student = await this.prisma.user.findUnique({ where: { id: dto.studentId } });
    if (!student || student.schoolId !== school.id || student.role !== Role.STUDENT) {
      throw new NotFoundException('Independent student not found');
    }

    const interval = this.normalizeInterval(dto.interval);
    const now = new Date();
    // Renewing before expiry extends from the current expiry date rather
    // than from today, so paying early never costs the student days they
    // already paid for.
    const periodStart = student.subscriptionExpiresAt && student.subscriptionExpiresAt > now ? student.subscriptionExpiresAt : now;
    const periodEnd = this.calculatePeriodEnd(periodStart, interval);

    const [invoice] = await this.prisma.$transaction([
      this.prisma.independentStudentInvoice.create({
        data: {
          studentId: student.id,
          invoiceNumber: this.createInvoiceNumber(student.id),
          studentName: dto.studentName?.trim() || student.name,
          amountKES: dto.amountKES,
          interval,
          periodStart,
          periodEnd,
          mpesaCode: dto.mpesaCode,
          payerPhone: dto.payerPhone,
          recordedById: actor.id,
        },
        include: { student: { select: { id: true, name: true } }, recordedBy: { select: { id: true, name: true } } },
      }),
      this.prisma.user.update({
        where: { id: student.id },
        data: { subscriptionExpiresAt: periodEnd, isActive: true },
      }),
    ]);

    return invoice;
  }

  private normalizeInterval(interval?: string): SubscriptionInterval {
    return interval?.toLowerCase() === 'annual' ? SubscriptionInterval.ANNUAL : SubscriptionInterval.MONTHLY;
  }

  private calculatePeriodEnd(periodStart: Date, interval: SubscriptionInterval): Date {
    const periodEnd = new Date(periodStart);
    if (interval === SubscriptionInterval.ANNUAL) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }
    return periodEnd;
  }

  private readPositiveAmount(key: string): number {
    const parsed = Number(this.configService.get<string>(key));
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
  }

  private createInvoiceNumber(studentId: number): string {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `IND-${stamp}-${studentId}-${random}`;
  }

  private createTemporaryPassword(): string {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const alphabet = `${uppercase}${lowercase}${digits}`;
    const characters = [
      uppercase[randomInt(uppercase.length)],
      lowercase[randomInt(lowercase.length)],
      digits[randomInt(digits.length)],
    ];

    while (characters.length < 10) {
      characters.push(alphabet[randomInt(alphabet.length)]);
    }

    for (let index = characters.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInt(index + 1);
      [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
    }

    return characters.join('');
  }
}
