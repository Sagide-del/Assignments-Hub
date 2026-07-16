import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { PathwaysService } from './pathways.service';
import { CreateTrackDto } from './dto/create-track.dto';
import { UpdateTrackDto } from './dto/update-track.dto';
import { SelectTrackDto } from './dto/select-track.dto';
import { UpdateSelectionNotesDto } from './dto/update-selection-notes.dto';
import { RecommendationRequestDto } from './dto/recommendation-request.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditAction } from '../common/decorators/audit.decorator';
import { OptionalParseIntPipe } from '../common/pipes/optional-parse-int.pipe';

@Controller('pathways')
export class PathwaysController {
  constructor(private readonly pathwaysService: PathwaysService) {}

  // ---- Catalog ----

  // Any authenticated role can browse — students exploring, staff advising.
  @Get()
  findAllPathways() {
    return this.pathwaysService.findAllPathways();
  }

  @Get('tracks/:id')
  findTrack(@Param('id', ParseIntPipe) id: number) {
    return this.pathwaysService.findTrack(id);
  }

  @Post('tracks')
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('pathway_track.create')
  createTrack(@Body() dto: CreateTrackDto) {
    return this.pathwaysService.createTrack(dto);
  }

  @Patch('tracks/:id')
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('pathway_track.update')
  updateTrack(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTrackDto) {
    return this.pathwaysService.updateTrack(id, dto);
  }

  // ---- Recommendation engine (stateless) ----

  @Post('recommendations')
  recommend(@Body() dto: RecommendationRequestDto) {
    return this.pathwaysService.recommend(dto);
  }

  // ---- Selections ----

  @Post('selections')
  @Roles(Role.STUDENT)
  @AuditAction('pathway_selection.create')
  selectTrack(@Body() dto: SelectTrackDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.pathwaysService.selectTrack(dto, actor);
  }

  // Edits the reasoning notes on the CURRENT selection without changing
  // track or creating a new history entry.
  @Patch('selections/current')
  @Roles(Role.STUDENT)
  @AuditAction('pathway_selection.update_notes')
  updateActiveNotes(@Body() dto: UpdateSelectionNotesDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.pathwaysService.updateActiveNotes(dto.notes, actor);
  }

  @Get('selections')
  findSelections(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('studentId', new OptionalParseIntPipe()) studentId?: number,
    @Query('schoolId', new OptionalParseIntPipe()) schoolId?: number,
    @Query('grade') grade?: string,
    @Query('includeHistory') includeHistory?: string,
  ) {
    return this.pathwaysService.findSelections(actor, {
      studentId,
      schoolId,
      grade,
      includeHistory: includeHistory === 'true',
    });
  }

  // Aggregated counts by pathway/track for the teacher/admin dashboard.
  // Registered before ':studentId/summary' below only for readability —
  // Nest actually distinguishes them fine either order since 'stats' has no
  // further path segment and 'summary' routes are one segment deeper.
  @Get('selections/stats')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  getStats(@CurrentUser() actor: AuthenticatedUser, @Query('schoolId', new OptionalParseIntPipe()) schoolId?: number) {
    return this.pathwaysService.getStats(actor, schoolId);
  }

  // One student's current selection + full history — powers both the "my
  // pathway" dashboard card (self) and the PDF report (self or, for staff,
  // any student in their school).
  @Get('selections/:studentId/summary')
  getStudentSummary(@Param('studentId', ParseIntPipe) studentId: number, @CurrentUser() actor: AuthenticatedUser) {
    return this.pathwaysService.getStudentSummary(studentId, actor);
  }

  @Get('selections/:id')
  findOneSelection(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthenticatedUser) {
    return this.pathwaysService.findOneSelection(id, actor);
  }
}
