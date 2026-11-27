import { Public } from "../common/decorators/public.decorator";
import { PrismaService } from "../prisma/prisma.service";
import {
  Controller,
  Get,
  Header,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { RecoveryService } from "./recovery.service";
import { EngagementReportService } from "./engagement-report.service";
@Controller("learning-coach")
@Roles(Role.STUDENT)
export class LearningHubController {
  constructor(
    private readonly recovery: RecoveryService,
    private readonly reports: EngagementReportService,
  ) {}
  @Get("recovery")
  @Header("Cache-Control", "private, no-store")
  queue(@CurrentUser() actor: AuthenticatedUser) {
    return this.recovery.load(actor);
  }
  @Get("engagement")
  @Header("Cache-Control", "private, no-store")
  report(
    @CurrentUser() actor: AuthenticatedUser,
    @Query("days", new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.reports.data(actor, days);
  }
  @Get("engagement.pdf")
  async pdf(
    @CurrentUser() actor: AuthenticatedUser,
    @Query("days", new DefaultValuePipe(30), ParseIntPipe) days: number,
    @Res() res: Response,
  ) {
    const buffer = await this.reports.pdf(actor, days);
    res
      .set({
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="assignment-hub-learning-report.pdf"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      })
      .send(buffer);
  }
}

@Controller("learning-hub")
export class LearningHubCapabilitiesController {
  constructor(private readonly db: PrismaService) {}
  @Public()
  @Get("capabilities")
  async capabilities() {
    await Promise.all([
      this.db.learningCoachSession.count({ where: { id: -1 } }),
      this.db.userPresenceSession.count({ where: { id: -1 } }),
      this.db.skillLessonProgress.count({ where: { id: -1 } }),
      this.db.lessonContent.count({
        where: { id: "00000000-0000-0000-0000-000000000000" },
      }),
      this.db.studentLessonProgress.count({
        where: { id: "00000000-0000-0000-0000-000000000000" },
      }),
    ]);
    return {
      recoveryLoopVersion: 1,
      engagementReportVersion: 1,
      pdfPages: 1,
      guidedLessonsVersion: 2,
    };
  }
}
