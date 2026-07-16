import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { SupportNeedsService } from './support-needs.service';
import { SubmitSupportAssessmentDto } from './dto/submit-support-assessment.dto';
import { CreateSupportInstitutionDto } from './dto/create-support-institution.dto';
import { UpdateSupportInstitutionDto } from './dto/update-support-institution.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditAction } from '../common/decorators/audit.decorator';
import { OptionalParseIntPipe } from '../common/pipes/optional-parse-int.pipe';

@Controller('support-needs')
export class SupportNeedsController {
  constructor(private readonly supportNeedsService: SupportNeedsService) {}

  // ---- Institution catalog ----

  // Any authenticated role can browse — students exploring, staff advising.
  @Get('institutions')
  findAllInstitutions(@Query('type') type?: string, @Query('category') category?: string) {
    return this.supportNeedsService.findAllInstitutions({ type, category });
  }

  @Post('institutions')
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('support_institution.create')
  createInstitution(@Body() dto: CreateSupportInstitutionDto) {
    return this.supportNeedsService.createInstitution(dto);
  }

  @Patch('institutions/:id')
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('support_institution.update')
  updateInstitution(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSupportInstitutionDto) {
    return this.supportNeedsService.updateInstitution(id, dto);
  }

  // ---- Assessments ----

  @Post('assessments')
  @Roles(Role.STUDENT)
  @AuditAction('support_assessment.submit')
  submitAssessment(@Body() dto: SubmitSupportAssessmentDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.supportNeedsService.submitAssessment(dto, actor);
  }

  @Get('assessments')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  findAssessments(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('schoolId', new OptionalParseIntPipe()) schoolId?: number,
    @Query('grade') grade?: string,
    @Query('category') category?: string,
  ) {
    return this.supportNeedsService.findAssessments(actor, { schoolId, grade, category });
  }

  // Registered before ':studentId/summary' for readability — Nest
  // distinguishes them fine either order since 'stats' has no further path
  // segment and 'summary' routes are one segment deeper.
  @Get('assessments/stats')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  getStats(@CurrentUser() actor: AuthenticatedUser, @Query('schoolId', new OptionalParseIntPipe()) schoolId?: number) {
    return this.supportNeedsService.getStats(actor, schoolId);
  }

  // One student's current assessment (with computed recommendation) + full
  // history — self (STUDENT) or, for staff, any student in their school.
  @Get('assessments/:studentId/summary')
  getStudentSummary(@Param('studentId', ParseIntPipe) studentId: number, @CurrentUser() actor: AuthenticatedUser) {
    return this.supportNeedsService.getStudentSummary(studentId, actor);
  }
}
