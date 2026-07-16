import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { LabSessionsService } from './lab-sessions.service';
import { CreateLabSessionDto } from './dto/create-lab-session.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditAction } from '../common/decorators/audit.decorator';
import { OptionalParseIntPipe } from '../common/pipes/optional-parse-int.pipe';

@Controller('lab-sessions')
export class LabSessionsController {
  constructor(private readonly labSessionsService: LabSessionsService) {}

  @Post()
  @Roles(Role.STUDENT)
  @AuditAction('lab_session.create')
  create(@Body() dto: CreateLabSessionDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.labSessionsService.create(dto, actor);
  }

  @Get()
  findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('studentId', new OptionalParseIntPipe()) studentId?: number,
    @Query('schoolId', new OptionalParseIntPipe()) schoolId?: number,
  ) {
    return this.labSessionsService.findAll(actor, { studentId, schoolId });
  }
}
