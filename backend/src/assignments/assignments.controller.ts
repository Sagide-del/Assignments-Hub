import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditAction } from '../common/decorators/audit.decorator';
import { SubmissionsService } from '../submissions/submissions.service';
import { CreateSubmissionDto } from '../submissions/dto/create-submission.dto';
import { OptionalParseIntPipe } from '../common/pipes/optional-parse-int.pipe';

@Controller('assignments')
export class AssignmentsController {
  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly submissionsService: SubmissionsService,
  ) {}

  @Post()
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  @AuditAction('assignment.create')
  create(@Body() dto: CreateAssignmentDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.assignmentsService.create(dto, actor);
  }

  // Checks a JSON exam paper against the full schema (basic well-formedness
  // + per-question-type structural rules — see AssignmentJsonDto and
  // AssignmentsService.validateExamJsonRaw) WITHOUT persisting anything.
  // Powers the Teacher Dashboard's upload preview: a teacher can fix every
  // problem the response lists before ever hitting "Publish". `@Body() body:
  // any` deliberately bypasses the global ValidationPipe's automatic
  // DTO validation (which would throw on the first bad field) so every
  // problem in the file can be collected and returned together.
  @Post('validate')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  async validateJson(@Body() body: any) {
    const result = await this.assignmentsService.validateExamJsonRaw(body);
    return { valid: result.valid, errors: result.errors, computedTotalMarks: result.computedTotalMarks };
  }

  // Validates (same rules as POST /assignments/validate, so the two can
  // never disagree) and, only if valid, creates the assignment/sections/
  // questions from a JSON exam paper in one atomic transaction.
  @Post('from-json')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  @AuditAction('assignment.create_from_json')
  async createFromJson(@Body() body: any, @CurrentUser() actor: AuthenticatedUser) {
    const result = await this.assignmentsService.validateExamJsonRaw(body);
    if (!result.valid) {
      throw new BadRequestException({ message: 'Exam JSON failed validation', errors: result.errors });
    }
    return this.assignmentsService.createFromJson(result.dto, result.computedTotalMarks, actor);
  }

  @Get()
  findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('schoolId', new OptionalParseIntPipe()) schoolId?: number,
  ) {
    return this.assignmentsService.findAll(actor, schoolId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthenticatedUser) {
    return this.assignmentsService.findOne(id, actor);
  }

  @Get(':id/questions')
  findQuestions(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthenticatedUser) {
    return this.assignmentsService.findQuestions(id, actor);
  }

  @Patch(':id')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  @AuditAction('assignment.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAssignmentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.assignmentsService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  @AuditAction('assignment.delete')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthenticatedUser) {
    return this.assignmentsService.remove(id, actor);
  }

  // Nested under /assignments so a student's submission is always created
  // in the context of the assignment it belongs to.
  @Post(':id/submissions')
  @Roles(Role.STUDENT)
  @AuditAction('submission.create')
  submit(
    @Param('id', ParseIntPipe) assignmentId: number,
    @Body() dto: CreateSubmissionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.submissionsService.create(assignmentId, dto, actor);
  }

  // STUDENT is allowed here too — SubmissionsService.findAll already scopes
  // a STUDENT actor to their own submissions only (see its `role ===
  // Role.STUDENT` branch), so this doubles as "get my submission for this
  // assignment" (a list of at most one, since a student can't submit an
  // assignment twice) for the exam-taking UI to check on page load.
  @Get(':id/submissions')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN, Role.STUDENT)
  listSubmissions(
    @Param('id', ParseIntPipe) assignmentId: number,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.submissionsService.findAll(actor, { assignmentId });
  }
}
