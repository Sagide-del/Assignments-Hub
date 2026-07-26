import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { TalentsService } from './talents.service';
import { UpsertTalentProfileDto } from './dto/upsert-talent-profile.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditAction } from '../common/decorators/audit.decorator';
import { OptionalParseIntPipe } from '../common/pipes/optional-parse-int.pipe';

@Controller('talents')
export class TalentsController {
  constructor(private readonly talentsService: TalentsService) {}

  @Post('profile')
  @Roles(Role.STUDENT)
  @AuditAction('talent_profile.upsert')
  upsertMyProfile(@Body() dto: UpsertTalentProfileDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.talentsService.upsertMyProfile(dto, actor);
  }

  // Self (STUDENT) or, for staff, any student in scope — scoped inside the
  // service.
  @Get('profile/:studentId')
  getStudentProfile(@Param('studentId', ParseIntPipe) studentId: number, @CurrentUser() actor: AuthenticatedUser) {
    return this.talentsService.getStudentProfile(studentId, actor);
  }

  @Get()
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('schoolId', new OptionalParseIntPipe()) schoolId?: number,
    @Query('grade') grade?: string,
  ) {
    return this.talentsService.findAll(actor, { schoolId, grade });
  }
}
