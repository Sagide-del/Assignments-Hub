import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrackDto } from './dto/create-track.dto';
import { UpdateTrackDto } from './dto/update-track.dto';
import { SelectTrackDto } from './dto/select-track.dto';
import { RecommendationRequestDto } from './dto/recommendation-request.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../common/enums/role.enum';

// Standard 12-point KCSE grading scale, used only by the recommendation
// engine's "do this student's grades meet this track's requirement?" check
// (PathwaysService.recommend) — never used for actual academic records,
// which this platform doesn't otherwise track at the subject-grade level.
const KCSE_GRADE_POINTS: Record<string, number> = {
  A: 12,
  'A-': 11,
  'B+': 10,
  B: 9,
  'B-': 8,
  'C+': 7,
  C: 6,
  'C-': 5,
  'D+': 4,
  D: 3,
  'D-': 2,
  E: 1,
};

function gradeToPoints(grade: string | undefined | null): number | null {
  if (!grade) return null;
  const points = KCSE_GRADE_POINTS[grade.trim().toUpperCase()];
  return points ?? null;
}

// Senior School grades this feature targets — used to size the "how many
// students haven't chosen a pathway yet" stat. Junior School students can
// still browse and select early (nothing here blocks that), this list is
// only for the admin/teacher aggregate view's denominator.
const SENIOR_SCHOOL_GRADES = ['Grade 10', 'Grade 11', 'Grade 12'];

const TRACK_INCLUDE = { pathway: true } as const;

@Injectable()
export class PathwaysService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================================
  // Catalog (Pathway + Track) — platform-wide, read by everyone, written
  // only by PLATFORM_ADMIN. Day-to-day content changes are expected to go
  // through prisma/seed-pathways-data.ts; these write endpoints exist for
  // one-off tweaks without a full reseed/redeploy.
  // ==========================================================================

  findAllPathways() {
    return this.prisma.pathway.findMany({
      include: { tracks: { where: { isPublished: true }, orderBy: { order: 'asc' } } },
      orderBy: { order: 'asc' },
    });
  }

  async findTrack(id: number) {
    const track = await this.prisma.track.findUnique({ where: { id }, include: TRACK_INCLUDE });
    if (!track) throw new NotFoundException('Track not found');
    return track;
  }

  async createTrack(dto: CreateTrackDto) {
    const pathway = await this.prisma.pathway.findUnique({ where: { id: dto.pathwayId } });
    if (!pathway) throw new NotFoundException('Pathway not found');

    return this.prisma.track.create({
      data: {
        pathwayId: dto.pathwayId,
        key: dto.key,
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        requiredSubjects: dto.requiredSubjects as any,
        minMeanGrade: dto.minMeanGrade,
        interestTags: dto.interestTags as any,
        careers: dto.careers as any,
        skills: dto.skills as any,
        jobOutlook: dto.jobOutlook,
        jobGrowthRate: dto.jobGrowthRate,
        universitiesKenya: dto.universitiesKenya as any,
        universitiesIntl: dto.universitiesIntl as any,
        degreeDurationYears: dto.degreeDurationYears,
        nextSteps: dto.nextSteps as any,
        extracurriculars: dto.extracurriculars as any,
        certifications: dto.certifications as any,
        workExperience: dto.workExperience as any,
        isPublished: dto.isPublished ?? true,
      },
      include: TRACK_INCLUDE,
    });
  }

  async updateTrack(id: number, dto: UpdateTrackDto) {
    await this.findTrack(id);
    return this.prisma.track.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        requiredSubjects: dto.requiredSubjects as any,
        minMeanGrade: dto.minMeanGrade,
        interestTags: dto.interestTags as any,
        careers: dto.careers as any,
        skills: dto.skills as any,
        jobOutlook: dto.jobOutlook,
        jobGrowthRate: dto.jobGrowthRate,
        universitiesKenya: dto.universitiesKenya as any,
        universitiesIntl: dto.universitiesIntl as any,
        degreeDurationYears: dto.degreeDurationYears,
        nextSteps: dto.nextSteps as any,
        extracurriculars: dto.extracurriculars as any,
        certifications: dto.certifications as any,
        workExperience: dto.workExperience as any,
        isPublished: dto.isPublished,
      },
      include: TRACK_INCLUDE,
    });
  }

  // ==========================================================================
  // Recommendation engine — stateless. Scores every published track against
  // a student's self-reported subject grades and/or interest tags and
  // returns them ranked highest-match-first. Nothing here is persisted;
  // selecting a track (below) is a separate, explicit step.
  // ==========================================================================

  async recommend(dto: RecommendationRequestDto) {
    const pathways = await this.findAllPathways();
    const hasGrades = !!dto.subjectGrades?.length;
    const hasInterests = !!dto.interests?.length;
    const studentInterests = (dto.interests ?? []).map((i) => i.trim().toLowerCase());

    const results = pathways.flatMap((pathway) =>
      pathway.tracks.map((track) => {
        const requiredSubjects = (track.requiredSubjects as { subject: string; minGrade: string }[]) ?? [];
        const interestTags = ((track.interestTags as string[]) ?? []).map((t) => t.toLowerCase());

        // --- grade eligibility (0-100) ---
        let gradeScore = 50; // neutral default when the quiz skipped grades entirely
        const subjectAssessment = requiredSubjects.map((req) => {
          const match = dto.subjectGrades?.find(
            (sg) => sg.subject.trim().toLowerCase() === req.subject.trim().toLowerCase(),
          );
          const studentPoints = gradeToPoints(match?.grade);
          const requiredPoints = gradeToPoints(req.minGrade);
          const met = studentPoints != null && requiredPoints != null ? studentPoints >= requiredPoints : null;
          return { subject: req.subject, minGrade: req.minGrade, studentGrade: match?.grade ?? null, met };
        });
        if (hasGrades) {
          const assessed = subjectAssessment.filter((s) => s.met !== null);
          gradeScore = assessed.length > 0 ? (assessed.filter((s) => s.met).length / assessed.length) * 100 : 50;
        }

        // --- interest fit (0-100) ---
        let interestScore = 50; // neutral default when the quiz skipped interests entirely
        const matchedInterests = interestTags.filter((tag) => studentInterests.includes(tag));
        if (hasInterests) {
          interestScore = (matchedInterests.length / studentInterests.length) * 100;
        }

        // --- combined score: weight only the signals actually supplied ---
        let score: number;
        if (hasGrades && hasInterests) score = gradeScore * 0.5 + interestScore * 0.5;
        else if (hasGrades) score = gradeScore;
        else if (hasInterests) score = interestScore;
        else score = 50;

        return {
          pathway: { id: pathway.id, key: pathway.key, name: pathway.name, icon: pathway.icon, colorHex: pathway.colorHex },
          track: { id: track.id, key: track.key, name: track.name, icon: track.icon, description: track.description },
          score: Math.round(score),
          gradeScore: Math.round(gradeScore),
          interestScore: Math.round(interestScore),
          matchedInterests,
          subjectAssessment,
        };
      }),
    );

    results.sort((a, b) => b.score - a.score);
    return results;
  }

  // ==========================================================================
  // Student selections — history-preserving (see schema.prisma comment on
  // StudentPathwaySelection).
  // ==========================================================================

  async selectTrack(dto: SelectTrackDto, actor: AuthenticatedUser) {
    const track = await this.prisma.track.findUnique({ where: { id: dto.trackId } });
    if (!track) throw new NotFoundException('Track not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.studentPathwaySelection.updateMany({
        where: { studentId: actor.id, isActive: true },
        data: { isActive: false },
      });

      return tx.studentPathwaySelection.create({
        data: {
          schoolId: actor.schoolId,
          studentId: actor.id,
          trackId: dto.trackId,
          notes: dto.notes,
          source: dto.source ?? 'MANUAL',
        },
        include: { track: { include: TRACK_INCLUDE } },
      });
    });
  }

  async updateActiveNotes(notes: string | undefined, actor: AuthenticatedUser) {
    const active = await this.prisma.studentPathwaySelection.findFirst({
      where: { studentId: actor.id, isActive: true },
    });
    if (!active) throw new NotFoundException('You don\'t have an active pathway selection yet');

    return this.prisma.studentPathwaySelection.update({
      where: { id: active.id },
      data: { notes },
      include: { track: { include: TRACK_INCLUDE } },
    });
  }

  /**
   * STUDENT: always their own full history (isActive + past rows) — the
   * frontend distinguishes "current" (isActive) from "history" (the rest)
   * client-side rather than needing two separate endpoints.
   * TEACHER/SCHOOL_ADMIN/PLATFORM_ADMIN: current selections (isActive) for
   * their school by default, every student's whole history only if
   * `includeHistory` is explicitly requested (e.g. viewing one student's
   * timeline).
   */
  findSelections(
    actor: AuthenticatedUser,
    filters: { studentId?: number; schoolId?: number; grade?: string; includeHistory?: boolean } = {},
  ) {
    if (actor.role === Role.STUDENT) {
      return this.prisma.studentPathwaySelection.findMany({
        where: { studentId: actor.id },
        include: { track: { include: TRACK_INCLUDE } },
        orderBy: { createdAt: 'desc' },
      });
    }

    const targetSchoolId = actor.role === Role.PLATFORM_ADMIN ? filters.schoolId : actor.schoolId;

    return this.prisma.studentPathwaySelection.findMany({
      where: {
        schoolId: targetSchoolId,
        studentId: filters.studentId,
        isActive: filters.includeHistory ? undefined : true,
        student: filters.grade ? { grade: filters.grade } : undefined,
      },
      include: {
        track: { include: TRACK_INCLUDE },
        student: { select: { id: true, name: true, grade: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneSelection(id: number, actor: AuthenticatedUser) {
    const selection = await this.prisma.studentPathwaySelection.findUnique({
      where: { id },
      include: { track: { include: TRACK_INCLUDE }, student: { select: { id: true, name: true, grade: true } } },
    });
    if (!selection) throw new NotFoundException('Selection not found');

    if (actor.role === Role.STUDENT) {
      if (selection.studentId !== actor.id) {
        throw new ForbiddenException('You can only view your own pathway selections');
      }
    } else if (actor.role !== Role.PLATFORM_ADMIN && selection.schoolId !== actor.schoolId) {
      throw new ForbiddenException('You cannot access another school\'s data');
    }

    return selection;
  }

  /**
   * A student's current selection plus a display-ready timeline of past
   * ones — the shape the PDF report and the "my pathway" dashboard card
   * both want, computed once here rather than in two places.
   */
  async getStudentSummary(studentId: number, actor: AuthenticatedUser) {
    if (actor.role === Role.STUDENT && studentId !== actor.id) {
      throw new ForbiddenException('You can only view your own pathway selections');
    }

    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, grade: true, schoolId: true, school: { select: { name: true } } },
    });
    if (!student) throw new NotFoundException('Student not found');

    if (actor.role !== Role.STUDENT && actor.role !== Role.PLATFORM_ADMIN && student.schoolId !== actor.schoolId) {
      throw new ForbiddenException('You cannot access another school\'s data');
    }

    const history = await this.prisma.studentPathwaySelection.findMany({
      where: { studentId },
      include: { track: { include: TRACK_INCLUDE } },
      orderBy: { createdAt: 'desc' },
    });

    return {
      student,
      current: history.find((h) => h.isActive) ?? null,
      history,
    };
  }

  // ==========================================================================
  // Aggregated stats for teacher/admin dashboards.
  // ==========================================================================
  async getStats(actor: AuthenticatedUser, schoolId?: number) {
    const targetSchoolId = actor.role === Role.PLATFORM_ADMIN ? schoolId : actor.schoolId;

    const [active, totalSeniorStudents] = await Promise.all([
      this.prisma.studentPathwaySelection.findMany({
        where: { schoolId: targetSchoolId, isActive: true },
        include: { track: { include: TRACK_INCLUDE } },
      }),
      this.prisma.user.count({
        where: {
          schoolId: targetSchoolId,
          role: Role.STUDENT,
          grade: { in: SENIOR_SCHOOL_GRADES },
        },
      }),
    ]);

    const byPathway = new Map<string, { key: string; name: string; icon: string; colorHex: string; count: number }>();
    const byTrack = new Map<
      number,
      { id: number; key: string; name: string; pathwayKey: string; pathwayName: string; count: number }
    >();

    for (const selection of active) {
      const pathway = selection.track.pathway;
      const pathwayEntry = byPathway.get(pathway.key) ?? {
        key: pathway.key,
        name: pathway.name,
        icon: pathway.icon,
        colorHex: pathway.colorHex,
        count: 0,
      };
      pathwayEntry.count += 1;
      byPathway.set(pathway.key, pathwayEntry);

      const trackEntry = byTrack.get(selection.track.id) ?? {
        id: selection.track.id,
        key: selection.track.key,
        name: selection.track.name,
        pathwayKey: pathway.key,
        pathwayName: pathway.name,
        count: 0,
      };
      trackEntry.count += 1;
      byTrack.set(selection.track.id, trackEntry);
    }

    return {
      totalSeniorStudents,
      totalWithSelection: active.length,
      totalWithoutSelection: Math.max(totalSeniorStudents - active.length, 0),
      byPathway: [...byPathway.values()].sort((a, b) => b.count - a.count),
      byTrack: [...byTrack.values()].sort((a, b) => b.count - a.count),
    };
  }
}
