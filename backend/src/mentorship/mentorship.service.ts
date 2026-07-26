import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMentorshipRequestDto } from './dto/create-mentorship-request.dto';
import { UpdateMentorProfileDto } from './dto/update-mentor-profile.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../common/enums/role.enum';

const REQUEST_INCLUDE = {
  mentorProfile: { include: { teacher: { select: { id: true, name: true, subject: true } } } },
  student: { select: { id: true, name: true, grade: true } },
  logEntries: {
    include: { author: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

@Injectable()
export class MentorshipService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================================
  // Mentor directory — every active TEACHER at the school is listed by
  // default (per the explicit product decision to reuse existing teacher
  // accounts rather than build a separate mentor directory); a MentorProfile
  // row only exists once a teacher has customized their listing or a student
  // has requested them (see createRequest's lazy upsert below). Filtered out
  // only if a teacher has explicitly opted out (isAvailable: false).
  // ==========================================================================

  async findMentorDirectory(actor: AuthenticatedUser, filters: { schoolId?: number } = {}) {
    const targetSchoolId = actor.role === Role.PLATFORM_ADMIN ? filters.schoolId : actor.schoolId;

    const teachers = await this.prisma.user.findMany({
      where: { schoolId: targetSchoolId, role: Role.TEACHER, isActive: true },
      select: { id: true, name: true, subject: true, mentorProfile: true },
      orderBy: { name: 'asc' },
    });

    return teachers
      .filter((teacher) => teacher.mentorProfile?.isAvailable !== false)
      .map((teacher) => ({
        teacherId: teacher.id,
        name: teacher.name,
        subject: teacher.subject,
        bio: teacher.mentorProfile?.bio ?? null,
        expertiseAreas: teacher.mentorProfile?.expertiseAreas ?? [],
        isAvailable: teacher.mentorProfile?.isAvailable ?? true,
      }));
  }

  // TEACHER: create-or-update their own listing (bio/expertise/opt-out).
  upsertMyMentorProfile(dto: UpdateMentorProfileDto, actor: AuthenticatedUser) {
    return this.prisma.mentorProfile.upsert({
      where: { teacherId: actor.id },
      create: {
        teacherId: actor.id,
        schoolId: actor.schoolId,
        bio: dto.bio,
        expertiseAreas: dto.expertiseAreas ?? [],
        isAvailable: dto.isAvailable ?? true,
      },
      update: {
        bio: dto.bio,
        expertiseAreas: dto.expertiseAreas,
        isAvailable: dto.isAvailable,
      },
    });
  }

  // ==========================================================================
  // Requests — a student's ask to connect with a mentor, plus the ongoing
  // log once accepted.
  // ==========================================================================

  async createRequest(dto: CreateMentorshipRequestDto, actor: AuthenticatedUser) {
    const teacher = await this.prisma.user.findUnique({ where: { id: dto.teacherId } });
    if (!teacher || teacher.role !== Role.TEACHER || teacher.schoolId !== actor.schoolId) {
      throw new NotFoundException('Mentor not found at your school');
    }

    // Lazily create the MentorProfile row the first time this teacher is
    // requested — see findMentorDirectory's comment on why teachers don't
    // need to pre-create one.
    const mentorProfile = await this.prisma.mentorProfile.upsert({
      where: { teacherId: teacher.id },
      create: { teacherId: teacher.id, schoolId: teacher.schoolId, isAvailable: true },
      update: {},
    });

    if (!mentorProfile.isAvailable) {
      throw new ForbiddenException('This mentor is not currently available for new requests');
    }

    return this.prisma.mentorshipRequest.create({
      data: {
        schoolId: actor.schoolId,
        studentId: actor.id,
        mentorProfileId: mentorProfile.id,
        topic: dto.topic,
        message: dto.message,
      },
      include: REQUEST_INCLUDE,
    });
  }

  /**
   * STUDENT: their own requests. TEACHER: requests directed at them.
   * SCHOOL_ADMIN/PLATFORM_ADMIN: every request at the school (or, for
   * PLATFORM_ADMIN, a specific school via `schoolId`).
   */
  findRequests(actor: AuthenticatedUser, filters: { schoolId?: number; status?: string } = {}) {
    if (actor.role === Role.STUDENT) {
      return this.prisma.mentorshipRequest.findMany({
        where: { studentId: actor.id },
        include: REQUEST_INCLUDE,
        orderBy: { createdAt: 'desc' },
      });
    }

    if (actor.role === Role.TEACHER) {
      return this.prisma.mentorshipRequest.findMany({
        where: { mentorProfile: { teacherId: actor.id }, status: filters.status as any },
        include: REQUEST_INCLUDE,
        orderBy: { createdAt: 'desc' },
      });
    }

    const targetSchoolId = actor.role === Role.PLATFORM_ADMIN ? filters.schoolId : actor.schoolId;
    return this.prisma.mentorshipRequest.findMany({
      where: { schoolId: targetSchoolId, status: filters.status as any },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  // TEACHER (the mentor on this thread) accepts/declines/completes a
  // request. SCHOOL_ADMIN/PLATFORM_ADMIN can also update status (e.g. to
  // close out a stale request) but not STUDENT — the ask, once made, is the
  // mentor's (or staff's) to action.
  async updateStatus(id: number, status: string, actor: AuthenticatedUser) {
    const request = await this.prisma.mentorshipRequest.findUnique({ where: { id }, include: { mentorProfile: true } });
    if (!request) throw new NotFoundException('Mentorship request not found');

    if (actor.role === Role.TEACHER && request.mentorProfile.teacherId !== actor.id) {
      throw new ForbiddenException('You can only respond to your own mentorship requests');
    }
    if (actor.role !== Role.TEACHER && actor.role !== Role.PLATFORM_ADMIN && request.schoolId !== actor.schoolId) {
      throw new ForbiddenException('You cannot access another school\'s data');
    }

    return this.prisma.mentorshipRequest.update({
      where: { id },
      data: { status: status as any, respondedAt: new Date() },
      include: REQUEST_INCLUDE,
    });
  }

  // Either party on an ACCEPTED (or since-COMPLETED) thread can add a dated
  // note — this is the "mentorship log."
  async addLogEntry(id: number, note: string, actor: AuthenticatedUser) {
    const request = await this.prisma.mentorshipRequest.findUnique({ where: { id }, include: { mentorProfile: true } });
    if (!request) throw new NotFoundException('Mentorship request not found');

    const isStudentParty = actor.role === Role.STUDENT && request.studentId === actor.id;
    const isMentorParty = actor.role === Role.TEACHER && request.mentorProfile.teacherId === actor.id;
    if (!isStudentParty && !isMentorParty) {
      throw new ForbiddenException('Only the student and mentor on this thread can add log entries');
    }
    if (request.status !== 'ACCEPTED' && request.status !== 'COMPLETED') {
      throw new ForbiddenException('This mentorship request has not been accepted yet');
    }

    return this.prisma.mentorshipLogEntry.create({
      data: { requestId: id, authorId: actor.id, note },
      include: { author: { select: { id: true, name: true, role: true } } },
    });
  }

  // ==========================================================================
  // Aggregated stats for teacher/admin dashboards.
  // ==========================================================================
  async getStats(actor: AuthenticatedUser, schoolId?: number) {
    const targetSchoolId = actor.role === Role.PLATFORM_ADMIN ? schoolId : actor.schoolId;

    const [requests, totalMentors] = await Promise.all([
      this.prisma.mentorshipRequest.findMany({ where: { schoolId: targetSchoolId } }),
      this.prisma.user.count({ where: { schoolId: targetSchoolId, role: Role.TEACHER, isActive: true } }),
    ]);

    return {
      totalMentors,
      totalRequests: requests.length,
      pending: requests.filter((r) => r.status === 'PENDING').length,
      accepted: requests.filter((r) => r.status === 'ACCEPTED').length,
      completed: requests.filter((r) => r.status === 'COMPLETED').length,
    };
  }
}
