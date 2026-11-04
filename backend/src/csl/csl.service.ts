import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { Role } from "../common/enums/role.enum";
import { assertStudentScope, studentScope } from "../teacher-scope/scope";
import { CslPhotoService } from "./csl-photo.service";
import { CSL_TARGET, LogCslDto, cslToday } from "./csl.dto";
@Injectable()
export class CslService {
  constructor(
    private readonly db: PrismaService,
    private readonly photos: CslPhotoService,
  ) {}
  async capabilities() {
    await this.db.cSL_Logbook.count({
      where: { id: "00000000-0000-0000-0000-000000000000" },
    });
    return {
      cslVersion: 1,
      target_hours: CSL_TARGET,
      photo_storage_configured: this.photos.configured(),
    };
  }
  private async senior(actor: AuthenticatedUser) {
    const s = await this.db.user.findFirst({
      where: {
        id: actor.id,
        schoolId: actor.schoolId,
        role: "STUDENT",
        grade: { in: ["Grade 10", "Grade 11", "Grade 12"] },
      },
    });
    if (actor.role !== Role.STUDENT || !s)
      throw new ForbiddenException(
        "The CSL hour logbook is available to Senior School learners in Grades 10–12.",
      );
    return s;
  }
  async log(
    dto: LogCslDto,
    file: Express.Multer.File | undefined,
    actor: AuthenticatedUser,
  ) {
    await this.senior(actor);
    const existing = await this.db.cSL_Logbook.findUnique({
      where: {
        student_id_submission_key: {
          student_id: actor.id,
          submission_key: dto.submission_key,
        },
      },
    });
    if (existing) {
      if (existing.school_id !== actor.schoolId) throw new ForbiddenException();
      return this.present(existing);
    }
    const date = new Date((dto.activity_date ?? cslToday()) + "T00:00:00.000Z");
    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !==
        (dto.activity_date ?? date.toISOString().slice(0, 10)) ||
      date.toISOString().slice(0, 10) > cslToday() ||
      date < new Date("2020-01-01")
    )
      throw new BadRequestException(
        "Choose a valid activity date between 2020 and today.",
      );
    const photo = await this.photos.store(file, actor.schoolId, actor.id);
    try {
      const saved = await this.db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM users WHERE id=${actor.id} AND school_id=${actor.schoolId} FOR UPDATE`;
        const prior = await tx.cSL_Logbook.findUnique({
          where: {
            student_id_submission_key: {
              student_id: actor.id,
              submission_key: dto.submission_key,
            },
          },
        });
        if (prior) return prior;
        const total = await tx.cSL_Logbook.aggregate({
          where: {
            student_id: actor.id,
            school_id: actor.schoolId,
            activity_date: date,
            review_status: { not: "REJECTED" },
          },
          _sum: { hours_logged: true },
        });
        if (
          Math.round((total._sum.hours_logged ?? 0) * 100) +
            Math.round(dto.hours_logged * 100) >
          2400
        )
          throw new BadRequestException(
            "Pending and approved hours cannot exceed 24 for one activity date.",
          );
        const row = await tx.cSL_Logbook.create({
          data: {
            student_id: actor.id,
            school_id: actor.schoolId,
            activity_name: dto.activity_name,
            description: dto.description,
            hours_logged: dto.hours_logged,
            activity_date: date,
            photo_url: photo,
            submission_key: dto.submission_key,
          },
        });
        await tx.auditLog.create({
          data: {
            schoolId: actor.schoolId,
            userId: actor.id,
            action: "csl.log.submitted",
            resource: `CSL_Logbook:${row.id}`,
            metadata: { hours: dto.hours_logged, date: date.toISOString() },
          },
        });
        return row;
      });
      if (photo && saved.photo_url !== photo)
        await this.photos
          .remove(photo, actor.schoolId, actor.id)
          .catch(() => {});
      return this.present(saved);
    } catch (error) {
      if (photo)
        await this.photos
          .remove(photo, actor.schoolId, actor.id)
          .catch(() => {});
      throw error;
    }
  }
  async present(row: any) {
    let photo: string | null = null,
      unavailable = false;
    if (row.photo_url) {
      try {
        photo = await this.photos.signed(
          row.photo_url,
          row.school_id,
          row.student_id,
        );
      } catch {
        unavailable = true;
      }
    }
    return {
      ...row,
      photo_url: photo,
      photo_unavailable: unavailable,
      submission_key: undefined,
      ai_claimed_at: undefined,
    };
  }
  async myHours(actor: AuthenticatedUser) {
    await this.senior(actor);
    const logs = await this.db.cSL_Logbook.findMany({
      where: { student_id: actor.id, school_id: actor.schoolId },
      orderBy: [{ activity_date: "desc" }, { created_at: "desc" }],
    });
    const total =
      Math.round(
        logs
          .filter((r) => r.teacher_approved && r.review_status === "APPROVED")
          .reduce((s, r) => s + r.hours_logged, 0) * 100,
      ) / 100;
    return {
      approved_hours: Math.round(total * 100) / 100,
      target_hours: CSL_TARGET,
      pending_hours:
        Math.round(
          logs
            .filter((r) => r.review_status === "PENDING")
            .reduce((s, r) => s + r.hours_logged, 0) * 100,
        ) / 100,
      complete: total >= CSL_TARGET,
      logs: await Promise.all(logs.map((r) => this.present(r))),
    };
  }
  async pending(actor: AuthenticatedUser) {
    if (actor.role !== Role.TEACHER) throw new ForbiddenException();
    const scope = await studentScope(this.db, actor);
    const logs = await this.db.cSL_Logbook.findMany({
      where: {
        school_id: actor.schoolId,
        review_status: "PENDING",
        student: { is: scope },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            admissionNumber: true,
            grade: true,
            studentProfile: { select: { stream: true } },
          },
        },
      },
      orderBy: { created_at: "asc" },
      take: 200,
    });
    return {
      logs: await Promise.all(logs.map((r) => this.present(r))),
      limit: 200,
    };
  }
  async review(
    id: string,
    approve: boolean,
    comment: string | undefined,
    actor: AuthenticatedUser,
  ) {
    if (actor.role !== Role.TEACHER) throw new ForbiddenException();
    const row = await this.db.cSL_Logbook.findFirst({
      where: { id, school_id: actor.schoolId },
    });
    if (!row) throw new NotFoundException("CSL activity not found.");
    await assertStudentScope(this.db, actor, row.student_id);
    const saved = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "CSL_Logbook" WHERE id=${id} AND school_id=${actor.schoolId} FOR UPDATE`;
      const current = await tx.cSL_Logbook.findUniqueOrThrow({ where: { id } });
      const student = await tx.user.findFirst({
        where: {
          id: row.student_id,
          schoolId: actor.schoolId,
          role: "STUDENT",
        },
        select: { grade: true, studentProfile: { select: { stream: true } } },
      });
      const pair =
        student &&
        (await tx.teacherAssignment.findFirst({
          where: {
            teacher_id: actor.id,
            school_id: actor.schoolId,
            teacher: {
              isActive: true,
              role: "TEACHER",
              schoolId: actor.schoolId,
            },
            stream: {
              school_id: actor.schoolId,
              grade: student.grade ?? "",
              name: student.studentProfile?.stream ?? "",
            },
          },
        }));
      if (!pair)
        throw new ForbiddenException(
          "This learner is outside your assigned streams.",
        );
      if (current.review_status !== "PENDING") {
        if (approve && current.teacher_approved) return current;
        throw new BadRequestException(
          "This activity has already been reviewed.",
        );
      }
      const updated = await tx.cSL_Logbook.update({
        where: { id },
        data: {
          teacher_approved: approve,
          approved_by: approve ? actor.id : null,
          approved_at: approve ? new Date() : null,
          review_status: approve ? "APPROVED" : "REJECTED",
          rejection_comment: approve ? null : comment,
          reviewed_by: actor.id,
          reviewed_at: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          schoolId: actor.schoolId,
          userId: actor.id,
          action: approve ? "csl.log.approved" : "csl.log.rejected",
          resource: `CSL_Logbook:${id}`,
          metadata: {
            studentId: row.student_id,
            hours: row.hours_logged,
            ...(!approve ? { comment: comment ?? "" } : {}),
          },
        },
      });
      return updated;
    });
    return this.present(saved);
  }
  async pdfData(studentId: number, actor: AuthenticatedUser) {
    const student = await this.db.user.findUnique({
      where: { id: studentId },
      include: { school: true, studentProfile: true },
    });
    if (!student || student.role !== "STUDENT")
      throw new NotFoundException("Learner not found.");
    if (actor.role === Role.STUDENT) {
      if (actor.id !== student.id || actor.schoolId !== student.schoolId)
        throw new ForbiddenException();
    } else if (actor.role === Role.TEACHER)
      await assertStudentScope(this.db, actor, student.id);
    else if (
      actor.role !== Role.PLATFORM_ADMIN &&
      (actor.role !== Role.SCHOOL_ADMIN || actor.schoolId !== student.schoolId)
    )
      throw new ForbiddenException();
    const logs = await this.db.cSL_Logbook.findMany({
      where: {
        student_id: student.id,
        school_id: student.schoolId,
        teacher_approved: true,
        review_status: "APPROVED",
      },
      orderBy: [{ activity_date: "asc" }, { created_at: "asc" }],
    });
    const hours =
      Math.round(logs.reduce((s, r) => s + r.hours_logged, 0) * 100) / 100;
    if (hours < CSL_TARGET)
      throw new BadRequestException(
        "The school CSL hours target has not yet been reached.",
      );
    return { student, logs, hours, target: CSL_TARGET };
  }
}
