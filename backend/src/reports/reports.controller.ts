import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { OptionalParseIntPipe } from '../common/pipes/optional-parse-int.pipe';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('users')
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  users(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('schoolId', new OptionalParseIntPipe()) schoolId?: number,
  ) {
    return this.reportsService.usersReport(actor, schoolId);
  }

  @Get('assignments')
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN, Role.TEACHER)
  assignments(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('schoolId', new OptionalParseIntPipe()) schoolId?: number,
  ) {
    return this.reportsService.assignmentsReport(actor, schoolId);
  }

  @Get('labs')
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN, Role.TEACHER)
  labs(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('schoolId', new OptionalParseIntPipe()) schoolId?: number,
  ) {
    return this.reportsService.labsReport(actor, schoolId);
  }

  @Get('financial')
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  financial(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('schoolId', new OptionalParseIntPipe()) schoolId?: number,
  ) {
    return this.reportsService.financialReport(actor, schoolId);
  }

  // The literal "report card" — one student's grades, used by the student's
  // own dashboard and by teachers/admins looking up a specific student.
  @Get('student/:studentId')
  @Roles(Role.PLATFORM_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  studentReportCard(
    @Param('studentId', ParseIntPipe) studentId: number,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.reportsService.studentReportCard(actor, studentId);
  }
}
