import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertTalentProfileDto } from './dto/upsert-talent-profile.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class TalentsService {
  constructor(private readonly prisma: PrismaService) {}

  // STUDENT: create-or-update their own single profile. Kept as a plain
  // upsert (not history-versioned) — see schema.prisma's comment on
  // StudentTalentProfile.
  upsertMyProfile(dto: UpsertTalentProfileDto, actor: AuthenticatedUser) {
    return this.prisma.studentTalentProfile.upsert({
      where: { studentId: actor.id },
      create: {
        schoolId: actor.schoolId,
        studentId: actor.id,
        talents: dto.talents ?? [],
        strengths: dto.strengths ?? [],
        interests: dto.interests ?? [],
        reflection: dto.reflection,
        growthPlan: dto.growthPlan,
      },
      update: {
        talents: dto.talents,
        strengths: dto.strengths,
        interests: dto.interests,
        reflection: dto.reflection,
        growthPlan: dto.growthPlan,
      },
    });
  }

  /**
   * Self (STUDENT) or, for staff, any student in scope — powers both the
   * student's own "My Talents & Strengths" tab and a teacher/mentor view of
   * one student's profile. Always returns a `profile` of null rather than
   * 404ing when the student hasn't filled one in yet, since "not started"
   * is a normal, expected state here (unlike e.g. a pathway selection).
   */
  async getStudentProfile(studentId: number, actor: AuthenticatedUser) {
    if (actor.role === Role.STUDENT && studentId !== actor.id) {
      throw new ForbiddenException('You can only view your own talent profile');
    }

    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, grade: true, schoolId: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    if (actor.role !== Role.STUDENT && actor.role !== Role.PLATFORM_ADMIN && student.schoolId !== actor.schoolId) {
      throw new ForbiddenException('You cannot access another school\'s data');
    }

    const profile = await this.prisma.studentTalentProfile.findUnique({ where: { studentId } });
    return { student, profile };
  }

  // TEACHER/SCHOOL_ADMIN/PLATFORM_ADMIN listing — school-scoped, for a
  // "who has filled in a talent profile" staff view.
  findAll(actor: AuthenticatedUser, filters: { schoolId?: number; grade?: string } = {}) {
    const targetSchoolId = actor.role === Role.PLATFORM_ADMIN ? filters.schoolId : actor.schoolId;

    return this.prisma.studentTalentProfile.findMany({
      where: {
        schoolId: targetSchoolId,
        student: filters.grade ? { grade: filters.grade } : undefined,
      },
      include: { student: { select: { id: true, name: true, grade: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
