import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { CslSubmissionsService } from './csl-submissions.service';
import { CreateCslSubmissionDto } from './dto/create-csl-submission.dto';
import { ReviewCslSubmissionDto } from './dto/review-csl-submission.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditAction } from '../common/decorators/audit.decorator';
import { OptionalParseIntPipe } from '../common/pipes/optional-parse-int.pipe';

@Controller('csl-submissions')
export class CslSubmissionsController {
  constructor(private readonly cslSubmissionsService: CslSubmissionsService) {}

  @Post()
  @Roles(Role.STUDENT)
  @AuditAction('csl_submission.create')
  create(@Body() dto: CreateCslSubmissionDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.cslSubmissionsService.create(dto, actor);
  }

  @Get()
  findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('studentId', new OptionalParseIntPipe()) studentId?: number,
    @Query('cslActivityId', new OptionalParseIntPipe()) cslActivityId?: number,
    @Query('schoolId', new OptionalParseIntPipe()) schoolId?: number,
  ) {
    return this.cslSubmissionsService.findAll(actor, { studentId, cslActivityId, schoolId });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthenticatedUser) {
    return this.cslSubmissionsService.findOne(id, actor);
  }

  // "Tutor" review — approve, or send back for revision, with a score and
  // feedback.
  @Patch(':id/review')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  @AuditAction('csl_submission.review')
  review(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewCslSubmissionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.cslSubmissionsService.review(id, dto, actor);
  }
}
