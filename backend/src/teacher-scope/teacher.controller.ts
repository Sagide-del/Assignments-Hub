import { Public } from "../common/decorators/public.decorator";
import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { OptionalParseIntPipe } from "../common/pipes/optional-parse-int.pipe";
import { TeacherScopeGuard } from "./teacher-scope.guard";
import { resultScope, studentScope } from "./scope";

@Controller("teacher")
@Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
@UseGuards(TeacherScopeGuard)
export class TeacherController {
  constructor(private readonly db: PrismaService) {}
  @Get("capabilities")
  @Public()
  @Roles()
  async capabilities() {
    await Promise.all([
      this.db.stream.count({
        where: { id: "00000000-0000-0000-0000-000000000000" },
      }),
      this.db.teacherAssignment.count({
        where: { id: "00000000-0000-0000-0000-000000000000" },
      }),
    ]);
    return { teacherScopeVersion: 1 };
  }
  private school(actor: AuthenticatedUser, schoolId?: number) {
    return actor.role === Role.PLATFORM_ADMIN ? schoolId : actor.schoolId;
  }
  @Get("classes")
  classes(@CurrentUser() actor: AuthenticatedUser) {
    return this.db.teacherAssignment.findMany({
      where: { teacher_id: actor.id, school_id: actor.schoolId },
      include: { stream: true },
      orderBy: [{ subject: "asc" }, { stream_id: "asc" }],
    });
  }
  @Get("students")
  async students(
    @CurrentUser() actor: AuthenticatedUser,
    @Query("schoolId", new OptionalParseIntPipe()) schoolId?: number,
  ) {
    return this.db.user.findMany({
      where: {
        AND: [
          { schoolId: this.school(actor, schoolId), role: Role.STUDENT },
          await studentScope(this.db, actor),
        ],
      },
      select: {
        id: true,
        name: true,
        grade: true,
        admissionNumber: true,
        schoolId: true,
        studentProfile: { select: { className: true, stream: true } },
      },
      orderBy: { name: "asc" },
    });
  }
  @Get("results")
  async results(
    @CurrentUser() actor: AuthenticatedUser,
    @Query("schoolId", new OptionalParseIntPipe()) schoolId?: number,
  ) {
    return this.db.studentAcademicResult.findMany({
      where: {
        AND: [
          { schoolId: this.school(actor, schoolId) },
          await resultScope(this.db, actor),
        ],
      },
      include: { student: { select: { id: true, name: true, grade: true } } },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
  }
  @Get("sba")
  async sba(
    @CurrentUser() actor: AuthenticatedUser,
    @Query("schoolId", new OptionalParseIntPipe()) schoolId?: number,
  ) {
    return this.db.studentSbaEvidence.findMany({
      where: {
        AND: [
          { schoolId: this.school(actor, schoolId) },
          await resultScope(this.db, actor),
        ],
      },
      include: { student: { select: { id: true, name: true, grade: true } } },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
  }
  @Get("assignments")
  assignments(
    @CurrentUser() actor: AuthenticatedUser,
    @Query("schoolId", new OptionalParseIntPipe()) schoolId?: number,
  ) {
    return this.db.assignment.findMany({
      where: {
        schoolId: this.school(actor, schoolId),
        ...(actor.role === Role.TEACHER ? { createdById: actor.id } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
