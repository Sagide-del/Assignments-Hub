import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditAction } from '../common/decorators/audit.decorator';
import { OptionalParseIntPipe } from '../common/pipes/optional-parse-int.pipe';

@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get()
  findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('assignmentId', new OptionalParseIntPipe()) assignmentId?: number,
    @Query('schoolId', new OptionalParseIntPipe()) schoolId?: number,
  ) {
    return this.submissionsService.findAll(actor, { assignmentId, schoolId });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthenticatedUser) {
    return this.submissionsService.findOne(id, actor);
  }

  @Patch(':id/grade')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  @AuditAction('submission.grade')
  grade(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GradeSubmissionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.submissionsService.grade(id, dto, actor);
  }
}
