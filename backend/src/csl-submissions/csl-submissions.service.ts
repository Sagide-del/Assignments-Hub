import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCslSubmissionDto } from './dto/create-csl-submission.dto';
import { ReviewCslSubmissionDto } from './dto/review-csl-submission.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../common/enums/role.enum';
import { CslSubmissionStatus } from '@prisma/client';

@Injectable()
export class CslSubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Single endpoint for both first submission and resubmission. A student
   * can resubmit evidence as many times as needed while status is PENDING
   * or NEEDS_REVISION (each resubmit resets it back to PENDING for
   * re-review) — but not once a tutor has APPROVED it.
   */
  async create(dto: CreateCslSubmissionDto, actor: AuthenticatedUser) {
    const activity = await this.prisma.cslActivity.findUnique({ where: { id: dto.cslActivityId } });
    if (!activity) throw new NotFoundException('CSL activity not found');

    const existing = await this.prisma.cslSubmission.findUnique({
      where: { cslActivityId_studentId: { cslActivityId: dto.cslActivityId, studentId: actor.id } },
    });

    if (existing) {
      if (existing.status === CslSubmissionStatus.APPROVED) {
        throw new ConflictException('This activity has already been approved — nothing more to submit');
      }
      return this.prisma.cslSubmission.update({
        where: { id: existing.id },
        data: {
          evidenceUrl: dto.evidenceUrl,
          reflection: dto.reflection,
          status: CslSubmissionStatus.PENDING,
          // Clear any prior review — this is a fresh submission for review.
          score: null,
          maxScore: null,
          feedback: null,
          reviewedById: null,
          reviewedAt: null,
        },
      });
    }

    return this.prisma.cslSubmission.create({
      data: {
        schoolId: actor.schoolId,
        cslActivityId: dto.cslActivityId,
        studentId: actor.id,
        evidenceUrl: dto.evidenceUrl,
        reflection: dto.reflection,
      },
    });
  }

  findAll(
    actor: AuthenticatedUser,
    filters: { studentId?: number; cslActivityId?: number; schoolId?: number } = {},
  ) {
    if (actor.role === Role.STUDENT) {
      return this.prisma.cslSubmission.findMany({
        where: { studentId: actor.id, cslActivityId: filters.cslActivityId },
        include: { cslActivity: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    const targetSchoolId = actor.role === Role.PLATFORM_ADMIN ? filters.schoolId : actor.schoolId;

    return this.prisma.cslSubmission.findMany({
      where: {
        schoolId: targetSchoolId,
        studentId: filters.studentId,
        cslActivityId: filters.cslActivityId,
      },
      include: { cslActivity: true, student: { select: { id: true, name: true, grade: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, actor: AuthenticatedUser) {
    const submission = await this.prisma.cslSubmission.findUnique({
      where: { id },
      include: { cslActivity: true, student: { select: { id: true, name: true, grade: true } } },
    });
    if (!submission) throw new NotFoundException('CSL submission not found');

    if (actor.role === Role.STUDENT) {
      if (submission.studentId !== actor.id) {
        throw new ForbiddenException('You can only view your own submissions');
      }
    } else if (actor.role !== Role.PLATFORM_ADMIN && submission.schoolId !== actor.schoolId) {
      throw new ForbiddenException("You cannot access another school's data");
    }

    return submission;
  }

  async review(id: number, dto: ReviewCslSubmissionDto, actor: AuthenticatedUser) {
    const submission = await this.findOne(id, actor);

    if (actor.role === Role.STUDENT) {
      throw new ForbiddenException('You do not have permission to review CSL submissions');
    }

    const maxScore = dto.score !== undefined ? dto.maxScore ?? 100 : dto.maxScore;

    return this.prisma.cslSubmission.update({
      where: { id: submission.id },
      data: {
        status: dto.status as CslSubmissionStatus,
        score: dto.score,
        maxScore,
        feedback: dto.feedback,
        reviewedById: actor.id,
        reviewedAt: new Date(),
      },
      include: { cslActivity: true },
    });
  }
}
