import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IndependentPaymentClaimStatus,
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
      orderBy: { name: 'asc' },
    });

    const now = new Date();
    return students.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      admissionNumber: s.admissionNumber,
      grade: s.grade,
      parentPhone: s.parentPhone,
      isActive: s.isActive,
      subscriptionExpiresAt: s.subscriptionExpiresAt,
      status: !s.subscriptionExpiresAt ? 'NEVER_PAID' : s.subscriptionExpiresAt > now ? 'ACTIVE' : 'EXPIRED',
    }));
  }

  async createStudent(dto: CreateIndependentStudentDto, actor: AuthenticatedUser) {
    const school = await this.getOrCreateSchool();

    // Independent students don't come from a school register, so there's
    // no natural admission number — generate one if the admin didn't
    // supply one, unique enough within this one school.
    const admissionNumber = dto.admissionNumber?.trim() || `IND-${Date.now()}`;

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

  async findInvoices(studentId?: number) {
    const school = await this.getOrCreateSchool();
    return this.prisma.independentStudentInvoice.findMany({
      where: studentId ? { studentId } : { student: { schoolId: school.id } },
      include: { student: { select: { id: true, name: true } }, recordedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
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
}
