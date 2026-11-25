import demo from "./demo.json";
import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { TeacherScopeGuard } from "../teacher-scope/teacher-scope.guard";
import { PrismaService } from "../prisma/prisma.service";
import { ReportBookService } from "./report-book.service";
import { ReportBookPdfService } from "./report-book.pdf";
import {
  AiCommentsDto,
  BulkSaveDto,
  ClassTeacherDto,
  GenerateDto,
  PeriodDto,
  PeriodSubjectsDto,
  PolicyDto,
  ReopenDto,
  ReportCommentDto,
} from "./report-book.dto";
@Controller("report-book")
export class ReportBookController {
  constructor(
    private readonly service: ReportBookService,
    private readonly pdf: ReportBookPdfService,
  ) {}
  @Get("options")
  @Header("Cache-Control", "private, no-store")
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  options(@CurrentUser() a: AuthenticatedUser) {
    return this.service.options(a);
  }
  @Get("policy/:grade")
  @Header("Cache-Control", "private, no-store")
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  policy(
    @Param("grade", ParseIntPipe) g: number,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.service.policy(g, a);
  }
  @Post("policy") @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN) savePolicy(
    @Body() d: PolicyDto,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.service.savePolicy(d, a);
  }
  @Post("class-teachers") @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN) assign(
    @Body() d: ClassTeacherDto,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.service.assignClass(d, a);
  }
  @Post("periods") @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN) create(
    @Body() d: PeriodDto,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.service.createPeriod(d, a);
  }
  @Post("periods/:id/subjects")
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  subjects(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() d: PeriodSubjectsDto,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.service.updateSubjects(id, d.subjects, a);
  }
  @Get("periods/:id/gradebook")
  @Header("Cache-Control", "private, no-store")
  @UseGuards(TeacherScopeGuard)
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  gradebook(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("subject") subject: string,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.service.gradebook(id, subject ?? "", a);
  }
  @Post("gradebook/bulk-save")
  @UseGuards(TeacherScopeGuard)
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  save(@Body() d: BulkSaveDto, @CurrentUser() a: AuthenticatedUser) {
    return this.service.saveMarks(d, a);
  }
  @Post("gradebook/generate-comments")
  @UseGuards(TeacherScopeGuard)
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  suggest(@Body() d: AiCommentsDto, @CurrentUser() a: AuthenticatedUser) {
    return this.service.suggest(d, a);
  }
  @Get("periods/:id/aggregated")
  @Header("Cache-Control", "private, no-store")
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  aggregate(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.service.aggregate(id, a);
  }
  @Post("periods/:id/generate")
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  generate(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() d: GenerateDto,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.service.generate(id, !!d.rank, a);
  }
  @Get("periods/:id/reports")
  @Header("Cache-Control", "private, no-store")
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  cards(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() a: AuthenticatedUser,
    @Query("revision") revision?: string,
  ) {
    return this.service.cards(
      id,
      a,
      revision === undefined ? undefined : Number(revision),
    );
  }
  @Get("periods/:id/history")
  @Header("Cache-Control", "private, no-store")
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  history(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.service.history(id, a);
  }
  @Post("periods/:id/review")
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  review(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.service.transition(id, "review", undefined, a);
  }
  @Post("periods/:id/publish")
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  publish(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.service.transition(id, "publish", undefined, a);
  }
  @Post("periods/:id/reopen")
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  reopen(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() d: ReopenDto,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.service.transition(id, "reopen", d.reason, a);
  }
  @Get("my-reports")
  @Header("Cache-Control", "private, no-store")
  @Roles(Role.STUDENT)
  mine(@CurrentUser() a: AuthenticatedUser) {
    return this.service.mine(a);
  }
  @Get("reports/:id")
  @Header("Cache-Control", "private, no-store")
  @Roles(Role.STUDENT, Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  card(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.service.card(id, a);
  }
  @Post("reports/:id/comments")
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  comments(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() d: ReportCommentDto,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.service.comments(id, d, a);
  }
  @Get("reports/:id/pdf")
  @Roles(Role.STUDENT, Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  async download(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() a: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const card = await this.service.card(id, a);
    res
      .set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="school-report-${card.period.year}-${card.id}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      })
      .send(await this.pdf.render(card));
  }
}
@Controller("report-book")
export class ReportBookCapabilitiesController {
  constructor(private readonly db: PrismaService) {}
  @Public() @Get("capabilities") async capabilities() {
    await Promise.all([
      this.db.reportBookPeriod.count({
        where: { id: "00000000-0000-0000-0000-000000000000" },
      }),
      this.db.assessment_Record.count({
        where: { id: "00000000-0000-0000-0000-000000000000" },
      }),
      this.db.report_Card.count({
        where: { id: "00000000-0000-0000-0000-000000000000" },
      }),
      this.db.classTeacherAssignment.count({
        where: { id: "00000000-0000-0000-0000-000000000000" },
      }),
    ]);
    const school = await this.db.school.findUnique({
      where: { code: demo.schoolCode },
      select: { id: true, name: true, subscriptionStatus: true },
    });
    const accounts = school
      ? await this.db.user.findMany({
          where: {
            schoolId: school.id,
            email: { in: demo.accounts.map((a) => a.email) },
          },
          select: {
            email: true,
            passwordHash: true,
            role: true,
            isActive: true,
          },
        })
      : [];
    const demoStaffReady =
      !!school &&
      school.name === demo.schoolName &&
      school.subscriptionStatus === "ACTIVE" &&
      demo.accounts.every((a) =>
        accounts.some(
          (u) =>
            u.email === a.email &&
            u.role === a.role &&
            u.isActive &&
            u.passwordHash === a.passwordHash,
        ),
      );
    return {
      reportBookVersion: 1,
      publicationWorkflowVersion: 1,
      demoStaffReady,
    };
  }
}
