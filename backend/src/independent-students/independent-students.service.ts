import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionInterval, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateIndependentStudentDto } from './dto/create-independent-student.dto';
import { RecordIndependentInvoiceDto } from './dto/record-invoice.dto';
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
    return {
      tillNumber: this.configService.get('INDEPENDENT_MPESA_TILL_NUMBER') || '4382411',
      storeNumber: this.configService.get('INDEPENDENT_MPESA_STORE_NUMBER') || '4840093',
      instructions:
        'Pay the subscription amount via M-Pesa Buy Goods to the till number above, then record the M-Pesa confirmation code below to activate (or renew) the student.',
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
    const periodEnd = new Date(periodStart);
    if (interval === SubscriptionInterval.ANNUAL) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

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

  private createInvoiceNumber(studentId: number): string {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `IND-${stamp}-${studentId}-${random}`;
  }
}
