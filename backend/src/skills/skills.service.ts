import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  PaymentStatus,
  Prisma,
  Role,
  SkillContentStatus,
  SkillEnrollmentStatus,
  SmsType,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { CreateSkillCategoryDto } from './dto/create-skill-category.dto';
import { CreateSkillCourseDto } from './dto/create-skill-course.dto';
import { CreateSkillProviderDto } from './dto/create-skill-provider.dto';
import {
  CreateSkillPaymentDto,
  UpdateSkillEnrollmentDto,
  UpdateSkillPaymentDto,
} from './dto/skill-enrollment.dto';
import {
  UpdateSkillCategoryDto,
  UpdateSkillCourseDto,
  UpdateSkillProviderDto,
} from './dto/update-skill.dto';

const COURSE_INCLUDE = {
  category: true,
  provider: true,
  _count: { select: { enrollments: true } },
} as const;

@Injectable()
export class SkillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
  ) {}

  findCategories(actor: AuthenticatedUser) {
    return this.prisma.skillCategory.findMany({
      where: actor.role === Role.PLATFORM_ADMIN ? undefined : { status: SkillContentStatus.PUBLISHED },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { courses: true } } },
    });
  }

  findProviders(actor: AuthenticatedUser) {
    return this.prisma.skillProvider.findMany({
      where: actor.role === Role.PLATFORM_ADMIN ? undefined : { status: SkillContentStatus.PUBLISHED },
      orderBy: { name: 'asc' },
      include: { _count: { select: { courses: true } } },
    });
  }

  findCourses(actor: AuthenticatedUser, categoryId?: number) {
    const publishedOnly = actor.role !== Role.PLATFORM_ADMIN;
    return this.prisma.skillCourse.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        ...(publishedOnly
          ? {
              status: SkillContentStatus.PUBLISHED,
              category: { status: SkillContentStatus.PUBLISHED },
              provider: { status: SkillContentStatus.PUBLISHED },
            }
          : {}),
      },
      include: COURSE_INCLUDE,
      orderBy: [{ category: { displayOrder: 'asc' } }, { title: 'asc' }],
    });
  }

  async findCourse(id: number, actor: AuthenticatedUser) {
    const course = await this.prisma.skillCourse.findUnique({ where: { id }, include: COURSE_INCLUDE });
    if (!course) throw new NotFoundException('Skill course not found');
    if (
      actor.role !== Role.PLATFORM_ADMIN &&
      (course.status !== SkillContentStatus.PUBLISHED ||
        course.category.status !== SkillContentStatus.PUBLISHED ||
        course.provider.status !== SkillContentStatus.PUBLISHED)
    ) {
      throw new NotFoundException('Skill course not found');
    }

    if (actor.role === Role.STUDENT) {
      const enrollment = await this.prisma.skillEnrollment.findUnique({
        where: { studentId_courseId: { studentId: actor.id, courseId: id } },
      });
      return { ...course, enrollment };
    }

    return course;
  }

  createCategory(dto: CreateSkillCategoryDto) {
    return this.prisma.skillCategory.create({ data: dto });
  }

  updateCategory(id: number, dto: UpdateSkillCategoryDto) {
    return this.prisma.skillCategory.update({ where: { id }, data: dto });
  }

  createProvider(dto: CreateSkillProviderDto) {
    return this.prisma.skillProvider.create({ data: dto });
  }

  updateProvider(id: number, dto: UpdateSkillProviderDto) {
    return this.prisma.skillProvider.update({ where: { id }, data: dto });
  }

  async createCourse(dto: CreateSkillCourseDto) {
    await this.assertCategoryAndProvider(dto.categoryId, dto.providerId);
    return this.prisma.skillCourse.create({ data: this.courseData(dto), include: COURSE_INCLUDE });
  }

  async updateCourse(id: number, dto: UpdateSkillCourseDto) {
    const current = await this.prisma.skillCourse.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Skill course not found');
    await this.assertCategoryAndProvider(dto.categoryId ?? current.categoryId, dto.providerId ?? current.providerId);
    return this.prisma.skillCourse.update({ where: { id }, data: this.courseData(dto), include: COURSE_INCLUDE });
  }

  async removeCourse(id: number) {
    const course = await this.prisma.skillCourse.findUnique({
      where: { id },
      include: { _count: { select: { enrollments: true, payments: true } } },
    });
    if (!course) throw new NotFoundException('Skill course not found');
    if (course._count.enrollments > 0 || course._count.payments > 0) {
      return this.prisma.skillCourse.update({ where: { id }, data: { status: SkillContentStatus.ARCHIVED } });
    }
    return this.prisma.skillCourse.delete({ where: { id } });
  }

  async requestEnrollment(courseId: number, actor: AuthenticatedUser) {
    const course = await this.prisma.skillCourse.findFirst({
      where: {
        id: courseId,
        status: SkillContentStatus.PUBLISHED,
        category: { status: SkillContentStatus.PUBLISHED },
        provider: { status: SkillContentStatus.PUBLISHED },
      },
    });
    if (!course) throw new NotFoundException('Skill course not found');

    const existing = await this.prisma.skillEnrollment.findUnique({
      where: { studentId_courseId: { studentId: actor.id, courseId } },
    });
    if (existing) throw new ConflictException('Enrollment already requested for this course');

    const enrollment = await this.prisma.skillEnrollment.create({
      data: { studentId: actor.id, courseId },
      include: { course: { include: { category: true, provider: true } } },
    });

    const student = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: { name: true, parentPhone: true, studentProfile: { select: { parentPhone: true } } },
    });
    const parentPhone = student?.studentProfile?.parentPhone ?? student?.parentPhone;
    if (parentPhone) {
      await this.smsService.sendAndLog({
        schoolId: actor.schoolId,
        type: SmsType.BROADCAST,
        message: `Assignment Hub: ${student?.name ?? 'Your student'} requested enrollment in "${course.title}". Fee: KES ${course.costKES.toLocaleString()}. Please contact the school to review payment options.`,
        recipients: [{ phone: parentPhone, studentId: actor.id }],
        sentById: actor.id,
      });
    }

    return enrollment;
  }

  findStudentEnrollments(actor: AuthenticatedUser) {
    return this.prisma.skillEnrollment.findMany({
      where: { studentId: actor.id },
      include: { course: { include: { category: true, provider: true } } },
      orderBy: { requestedAt: 'desc' },
    });
  }

  findAllEnrollments() {
    return this.prisma.skillEnrollment.findMany({
      include: {
        student: { select: { id: true, name: true, school: { select: { id: true, name: true, code: true } } } },
        course: { include: { category: true, provider: true } },
      },
      orderBy: { requestedAt: 'desc' },
    });
  }

  updateEnrollment(id: number, dto: UpdateSkillEnrollmentDto) {
    return this.prisma.skillEnrollment.update({
      where: { id },
      data: {
        status: dto.status,
        paymentStatus: dto.paymentStatus,
        approvedAt:
          dto.status === SkillEnrollmentStatus.ACTIVE || dto.status === SkillEnrollmentStatus.AWAITING_PAYMENT
            ? new Date()
            : undefined,
        completedAt: dto.status === SkillEnrollmentStatus.COMPLETED ? new Date() : undefined,
      },
      include: { course: true, student: { select: { id: true, name: true, schoolId: true } } },
    });
  }

  findPayments() {
    return this.prisma.skillPayment.findMany({
      include: {
        student: { select: { id: true, name: true, school: { select: { id: true, name: true, code: true } } } },
        course: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPayment(dto: CreateSkillPaymentDto) {
    const [student, course, enrollment] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: dto.studentId, role: Role.STUDENT } }),
      this.prisma.skillCourse.findUnique({ where: { id: dto.courseId } }),
      this.prisma.skillEnrollment.findUnique({
        where: { studentId_courseId: { studentId: dto.studentId, courseId: dto.courseId } },
      }),
    ]);
    if (!student) throw new NotFoundException('Student not found');
    if (!course) throw new NotFoundException('Skill course not found');
    if (!enrollment) throw new ConflictException('An enrollment request is required before payment');

    return this.prisma.$transaction(async (transaction) => {
      const payment = await transaction.skillPayment.create({
        data: {
          studentId: dto.studentId,
          courseId: dto.courseId,
          paymentMethod: dto.paymentMethod,
          amountKES: course.costKES,
          transactionReference: dto.transactionReference,
          status: dto.status,
        },
      });
      if (dto.status === PaymentStatus.CONFIRMED) {
        await transaction.skillEnrollment.update({
          where: { id: enrollment.id },
          data: { paymentStatus: PaymentStatus.CONFIRMED, status: SkillEnrollmentStatus.ACTIVE, approvedAt: new Date() },
        });
      }
      return payment;
    });
  }

  async updatePayment(id: number, dto: UpdateSkillPaymentDto) {
    const payment = await this.prisma.skillPayment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Skill payment not found');
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.skillPayment.update({ where: { id }, data: dto });
      await transaction.skillEnrollment.update({
        where: { studentId_courseId: { studentId: payment.studentId, courseId: payment.courseId } },
        data: {
          paymentStatus: dto.status,
          ...(dto.status === PaymentStatus.CONFIRMED
            ? { status: SkillEnrollmentStatus.ACTIVE, approvedAt: new Date() }
            : {}),
        },
      });
      return updated;
    });
  }

  async getAdminSummary() {
    const [totalCourses, draftCourses, publishedCourses, categories, providers, pendingEnrollments, confirmedRevenue] =
      await Promise.all([
        this.prisma.skillCourse.count(),
        this.prisma.skillCourse.count({ where: { status: SkillContentStatus.DRAFT } }),
        this.prisma.skillCourse.count({ where: { status: SkillContentStatus.PUBLISHED } }),
        this.prisma.skillCategory.count(),
        this.prisma.skillProvider.count(),
        this.prisma.skillEnrollment.count({ where: { status: SkillEnrollmentStatus.REQUESTED } }),
        this.prisma.skillPayment.aggregate({ where: { status: PaymentStatus.CONFIRMED }, _sum: { amountKES: true } }),
      ]);
    return {
      totalCourses,
      draftCourses,
      publishedCourses,
      categories,
      providers,
      pendingEnrollments,
      confirmedRevenueKES: confirmedRevenue._sum.amountKES ?? 0,
    };
  }

  private async assertCategoryAndProvider(categoryId: number, providerId: number) {
    const [category, provider] = await Promise.all([
      this.prisma.skillCategory.findUnique({ where: { id: categoryId } }),
      this.prisma.skillProvider.findUnique({ where: { id: providerId } }),
    ]);
    if (!category) throw new NotFoundException('Skill category not found');
    if (!provider) throw new NotFoundException('Skill provider not found');
  }

  private courseData(dto: CreateSkillCourseDto | UpdateSkillCourseDto): Prisma.SkillCourseUncheckedCreateInput {
    return {
      ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
      ...(dto.providerId !== undefined ? { providerId: dto.providerId } : {}),
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.shortDescription !== undefined ? { shortDescription: dto.shortDescription } : {}),
      ...(dto.fullDescription !== undefined ? { fullDescription: dto.fullDescription } : {}),
      ...(dto.durationWeeks !== undefined ? { durationWeeks: dto.durationWeeks } : {}),
      ...(dto.level !== undefined ? { level: dto.level } : {}),
      ...(dto.costKES !== undefined ? { costKES: dto.costKES } : {}),
      ...(dto.certificateAvailable !== undefined ? { certificateAvailable: dto.certificateAvailable } : {}),
      ...(dto.thumbnailUrl !== undefined ? { thumbnailUrl: dto.thumbnailUrl } : {}),
      ...(dto.learningOutcomes !== undefined ? { learningOutcomes: dto.learningOutcomes } : {}),
      ...(dto.courseStructure !== undefined ? { courseStructure: dto.courseStructure } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    } as Prisma.SkillCourseUncheckedCreateInput;
  }
}
