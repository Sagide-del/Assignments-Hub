import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { TimetableService } from "./timetable.service";
import { TimetablePdfService } from "./timetable-pdf.service";
import {
  CompleteStudyBlockDto,
  GenerateTimetableDto,
  QuizSubmissionDto,
  SchoolScheduleDto,
} from "./timetable.dto";
@Controller("study-hub")
export class TimetableController {
  constructor(
    private readonly timetable: TimetableService,
    private readonly pdf: TimetablePdfService,
  ) {}
  @Get("capabilities") @Public() capabilities() {
    return this.timetable.capabilities();
  }
  @Get("timetable")
  @Roles(Role.STUDENT)
  @Header("Cache-Control", "private, no-store")
  current(@CurrentUser() actor: AuthenticatedUser) {
    return this.timetable.current(actor);
  }
  @Post("timetable/generate") @Roles(Role.STUDENT) generate(
    @Body() dto: GenerateTimetableDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.timetable.generateTimetable(
      actor.id,
      actor,
      dto.regenerate ?? false,
    );
  }
  @Get("timetable/:id")
  @Roles(Role.STUDENT)
  @Header("Cache-Control", "private, no-store")
  get(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.timetable.get(id, actor);
  }
  @Patch("timetable/:id/progress") @Roles(Role.STUDENT) progress(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CompleteStudyBlockDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.timetable.complete(id, dto, actor);
  }
  @Get("timetable/:id/quiz/:blockId")
  @Roles(Role.STUDENT)
  @Header("Cache-Control", "private, no-store")
  quiz(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("blockId") blockId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.timetable.quizView(id, blockId, actor);
  }
  @Post("timetable/:id/quiz/:blockId") @Roles(Role.STUDENT) submit(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("blockId") blockId: string,
    @Body() dto: QuizSubmissionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.timetable.submitQuiz(id, blockId, dto, actor);
  }
  @Get("timetable/:id/pdf") @Roles(Role.STUDENT) async download(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const data = await this.timetable.pdfData(id, actor),
      pdf = await this.pdf.render(data);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="assignment-hub-study-plan-${data.plan.week_start}.pdf"`,
    );
    res.send(pdf);
  }
  @Put("school-schedule") @Roles(Role.SCHOOL_ADMIN) school(
    @Body() dto: SchoolScheduleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.timetable.schoolSchedule(dto, actor);
  }
}
