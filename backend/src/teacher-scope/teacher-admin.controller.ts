import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { AuditAction } from "../common/decorators/audit.decorator";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import {
  TeacherAssignmentDto,
  CreateStreamDto,
} from "./dto/teacher-assignment.dto";
import { normalizeGrade } from "../common/utils/grade.util";

@Controller("admin")
@Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
export class TeacherAdminController {
  constructor(private readonly db: PrismaService) {}
  @Get("teachers")
  teachers(@CurrentUser() actor: AuthenticatedUser) {
    return this.db.user.findMany({
      where: { schoolId: actor.schoolId, role: Role.TEACHER },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        teacherAssignments: { include: { stream: true } },
      },
      orderBy: { name: "asc" },
    });
  }
  @Get("streams")
  streams(@CurrentUser() actor: AuthenticatedUser) {
    return this.db.stream.findMany({
      where: { school_id: actor.schoolId },
      orderBy: [{ grade: "asc" }, { name: "asc" }],
    });
  }
  @Post("streams")
  @AuditAction("teacher_stream.create")
  createStream(
    @Body() dto: CreateStreamDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const grade = normalizeGrade(dto.grade);
    if (!grade) throw new BadRequestException("Choose a valid grade.");
    return this.db.stream.upsert({
      where: {
        school_id_grade_name: {
          school_id: actor.schoolId,
          grade,
          name: dto.name.trim(),
        },
      },
      create: { school_id: actor.schoolId, grade, name: dto.name.trim() },
      update: {},
    });
  }
  @Post("teachers/:id/assignments")
  @AuditAction("teacher_assignment.create")
  async assign(
    @Param("id", ParseIntPipe) teacher_id: number,
    @Body() dto: TeacherAssignmentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const [teacher, stream] = await Promise.all([
      this.db.user.findFirst({
        where: {
          id: teacher_id,
          schoolId: actor.schoolId,
          role: Role.TEACHER,
          isActive: true,
        },
        select: { id: true },
      }),
      this.db.stream.findFirst({
        where: { id: dto.stream_id, school_id: actor.schoolId },
      }),
    ]);
    if (!teacher || !stream)
      throw new NotFoundException(
        "Teacher or stream was not found in your school.",
      );
    const subject = dto.subject.trim().replace(/\s+/g, " ");
    return this.db.teacherAssignment.upsert({
      where: {
        teacher_id_subject_stream_id: {
          teacher_id,
          subject,
          stream_id: stream.id,
        },
      },
      create: {
        teacher_id,
        school_id: actor.schoolId,
        subject,
        stream_id: stream.id,
      },
      update: {},
    });
  }
  @Delete("teachers/:id/assignments/:assignmentId")
  @AuditAction("teacher_assignment.delete")
  async remove(
    @Param("id", ParseIntPipe) teacher_id: number,
    @Param("assignmentId") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const result = await this.db.teacherAssignment.deleteMany({
      where: { id, teacher_id, school_id: actor.schoolId },
    });
    if (!result.count)
      throw new NotFoundException(
        "Teacher assignment not found in your school.",
      );
    return { removed: true };
  }
}
