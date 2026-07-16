import { Controller, Get, Param, ParseIntPipe, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PathwaysService } from './pathways.service';
import { PathwaysReportService } from './pathways-report.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

// Split out from PathwaysController because this route needs raw @Res()
// access to stream a PDF (see UsersController.downloadTemplate for the same
// pattern) rather than returning a JSON-serializable value like every other
// route in this module.
@Controller('pathways')
export class PathwaysReportController {
  constructor(
    private readonly pathwaysService: PathwaysService,
    private readonly pathwaysReportService: PathwaysReportService,
  ) {}

  // Role checks happen inside PathwaysService.getStudentSummary (STUDENT can
  // only pull their own; staff are scoped to their own school) — no
  // @Roles() here since every authenticated role is allowed to hit the
  // route, just scoped to different students.
  @Get('selections/:studentId/report')
  async downloadReport(
    @Param('studentId', ParseIntPipe) studentId: number,
    @CurrentUser() actor: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const summary = await this.pathwaysService.getStudentSummary(studentId, actor);
    const pdf = await this.pathwaysReportService.buildStudentReport(summary as any);

    const safeName = summary.student.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="career-pathway-report-${safeName}.pdf"`,
    });
    res.send(pdf);
  }
}
