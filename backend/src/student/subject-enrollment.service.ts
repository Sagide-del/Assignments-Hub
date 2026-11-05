import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { gradeNumber, pathwayKey, trackKey } from "./student-scope.policy";
import {
  CORE_ASSIGNMENT_SUBJECTS,
  validateElectives,
} from "./assignment-subjects";
@Injectable()
export class SubjectEnrollmentService {
  constructor(private readonly db: PrismaService) {}
  async capabilities() {
    await this.db.user.findFirst({
      where: { id: -1 },
      select: { elective_subjects: true },
    });
    return { studentElectivesVersion: 1 };
  }
  async options(grade: number) {
    if (!Number.isInteger(grade) || grade < 10 || grade > 12)
      throw new BadRequestException("Choose Grade 10, 11 or 12.");
    const rows = await this.db.curriculumTaxonomy.findMany({
      where: { grade },
      select: { subject: true, pathway: true, track: true },
    });
    const tracks = await this.db.track.findMany({
      where: { isPublished: true },
      include: { pathway: true },
      orderBy: { name: "asc" },
    });
    return {
      grade,
      core_subjects: CORE_ASSIGNMENT_SUBJECTS,
      subjects: [...new Set(rows.map((r) => r.subject))],
      recommendations: rows,
      tracks: tracks
        .filter((t) =>
          rows.some(
            (r) =>
              pathwayKey(r.pathway) === pathwayKey(t.pathway.name) &&
              trackKey(r.track) === trackKey(t.name),
          ),
        )
        .map((t) => ({ id: t.id, name: t.name, pathway: t.pathway.name })),
    };
  }
  async validate(grade: number, electives: unknown) {
    const rows = await this.db.curriculumTaxonomy.findMany({
      where: { grade },
      select: { subject: true },
    });
    try {
      return validateElectives(
        grade,
        electives,
        rows.map((r) => r.subject),
      );
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }
  async resolveTrack(
    grade: number,
    pathway: string | undefined,
    trackName: string | undefined,
  ) {
    if (!pathway || !trackName)
      throw new BadRequestException(
        "Senior enrolment requires Pathway and Track.",
      );
    const rows = await this.db.curriculumTaxonomy.findMany({
      where: { grade },
      select: { pathway: true, track: true },
    });
    if (
      !rows.some(
        (r) =>
          pathwayKey(r.pathway) === pathwayKey(pathway) &&
          trackKey(r.track) === trackKey(trackName),
      )
    )
      throw new BadRequestException("Track is not available for this grade.");
    const tracks = await this.db.track.findMany({ include: { pathway: true } });
    const track = tracks.find(
      (t) =>
        trackKey(t.name) === trackKey(trackName) &&
        pathwayKey(t.pathway.name) === pathwayKey(pathway),
    );
    if (!track)
      throw new BadRequestException(
        "Track is not configured. Contact your school administrator.",
      );
    return track;
  }
  async current(id: number, schoolId: number) {
    const user = await this.db.user.findFirst({
      where: { id, schoolId, role: "STUDENT" },
      include: {
        pathwaySelections: {
          where: { isActive: true },
          include: { track: { include: { pathway: true } } },
          take: 1,
        },
      },
    });
    if (!user) throw new ForbiddenException("Student profile not found.");
    return {
      grade: gradeNumber(user.grade),
      elective_subjects: user.elective_subjects,
      track_id: user.pathwaySelections[0]?.trackId ?? null,
      current_track: user.pathwaySelections[0]?.track ? {id:user.pathwaySelections[0].track.id,name:user.pathwaySelections[0].track.name,pathway:user.pathwaySelections[0].track.pathway.name}:null,
    };
  }
  async save(
    id: number,
    schoolId: number,
    electives: unknown,
    track_id?: number,
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "users" WHERE id=${id} AND school_id=${schoolId} FOR UPDATE`;
      const user = await tx.user.findFirst({
        where: { id, schoolId, role: "STUDENT", isActive: true },
        include: {
          studentProfile: true,
          pathwaySelections: { where: { isActive: true }, take: 1 },
        },
      });
      if (!user) throw new ForbiddenException("Student profile not found.");
      const grade = gradeNumber(user.grade);
      if (!grade) throw new BadRequestException("Set your grade first.");
      const rows = await tx.curriculumTaxonomy.findMany({
        where: { grade },
        select: { subject: true, pathway: true, track: true },
      });
      let selected: string[];
      try {
        selected = validateElectives(
          grade,
          electives,
          rows.map((r) => r.subject),
        );
      } catch (e) {
        throw new BadRequestException((e as Error).message);
      }
      if (grade >= 10) {
        const target = track_id ?? user.pathwaySelections[0]?.trackId;
        if (!target)
          throw new BadRequestException("Choose your senior-school track.");
        const track = await tx.track.findUnique({
          where: { id: target },
          include: { pathway: true },
        });
        if (
          !track ||
          (!track.isPublished &&
            target !== user.pathwaySelections[0]?.trackId) ||
          !rows.some(
            (r) =>
              pathwayKey(r.pathway) === pathwayKey(track.pathway.name) &&
              trackKey(r.track) === trackKey(track.name),
          )
        )
          throw new BadRequestException(
            "Choose a track available for your grade.",
          );
        if (user.pathwaySelections[0]?.trackId !== target) {
          await tx.studentPathwaySelection.updateMany({
            where: { studentId: id, schoolId, isActive: true },
            data: { isActive: false },
          });
          await tx.studentPathwaySelection.create({
            data: {
              studentId: id,
              schoolId,
              trackId: target,
              source: "MANUAL",
              notes: "Learner subject enrolment",
            },
          });
        }
        await tx.studentProfile.upsert({
          where: { userId: id },
          create: {
            userId: id,
            grade: user.grade,
            pathway: track.pathway.name,
          },
          update: { pathway: track.pathway.name },
        });
      }
      await tx.user.update({
        where: { id },
        data: { elective_subjects: selected },
      });
      return { elective_subjects: selected };
    });
  }
}
