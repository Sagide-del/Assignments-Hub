import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { MentorshipService } from './mentorship.service';
import { CreateMentorshipRequestDto } from './dto/create-mentorship-request.dto';
import { UpdateMentorProfileDto } from './dto/update-mentor-profile.dto';
import { UpdateMentorshipRequestStatusDto } from './dto/update-mentorship-status.dto';
import { AddMentorshipLogEntryDto } from './dto/add-mentorship-log-entry.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditAction } from '../common/decorators/audit.decorator';
import { OptionalParseIntPipe } from '../common/pipes/optional-parse-int.pipe';

@Controller('mentorship')
export class MentorshipController {
  constructor(private readonly mentorshipService: MentorshipService) {}

  // ---- Mentor directory ----

  // Any authenticated role can browse — students finding a mentor, staff
  // overseeing the program.
  @Get('mentors')
  findMentorDirectory(@CurrentUser() actor: AuthenticatedUser, @Query('schoolId', new OptionalParseIntPipe()) schoolId?: number) {
    return this.mentorshipService.findMentorDirectory(actor, { schoolId });
  }

  @Post('profile')
  @Roles(Role.TEACHER)
  @AuditAction('mentor_profile.upsert')
  upsertMyMentorProfile(@Body() dto: UpdateMentorProfileDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.mentorshipService.upsertMyMentorProfile(dto, actor);
  }

  // ---- Requests ----

  @Post('requests')
  @Roles(Role.STUDENT)
  @AuditAction('mentorship_request.create')
  createRequest(@Body() dto: CreateMentorshipRequestDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.mentorshipService.createRequest(dto, actor);
  }

  @Get('requests')
  findRequests(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('schoolId', new OptionalParseIntPipe()) schoolId?: number,
    @Query('status') status?: string,
  ) {
    return this.mentorshipService.findRequests(actor, { schoolId, status });
  }

  @Patch('requests/:id/status')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  @AuditAction('mentorship_request.update_status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMentorshipRequestStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.mentorshipService.updateStatus(id, dto.status, actor);
  }

  @Post('requests/:id/log')
  @Roles(Role.STUDENT, Role.TEACHER)
  @AuditAction('mentorship_request.log_entry')
  addLogEntry(@Param('id', ParseIntPipe) id: number, @Body() dto: AddMentorshipLogEntryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.mentorshipService.addLogEntry(id, dto.note, actor);
  }

  @Get('stats')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  getStats(@CurrentUser() actor: AuthenticatedUser, @Query('schoolId', new OptionalParseIntPipe()) schoolId?: number) {
    return this.mentorshipService.getStats(actor, schoolId);
  }
}
