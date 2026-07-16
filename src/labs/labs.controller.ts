import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { LabsService } from './labs.service';
import { CreateLabDto } from './dto/create-lab.dto';
import { UpdateLabDto } from './dto/update-lab.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditAction } from '../common/decorators/audit.decorator';

@Controller('labs')
export class LabsController {
  constructor(private readonly labsService: LabsService) {}

  @Post()
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('lab.create')
  create(@Body() dto: CreateLabDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.labsService.create(dto, actor);
  }

  // Any authenticated role (student/teacher/admin) can browse the catalog —
  // students on the STEM Labs page (auto-scoped to their own grade), staff
  // when picking what to assign (optionally filtered by ?grade=).
  @Get()
  findAll(@CurrentUser() actor: AuthenticatedUser, @Query('grade') grade?: string) {
    return this.labsService.findAll(actor, grade);
  }

  // actor is passed through so a STUDENT never receives quiz correctAnswers
  // in the response — see LabsService.findOne/stripAnswersForStudent. This
  // is also how the frontend loads a lab's video + quiz questions.
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthenticatedUser) {
    return this.labsService.findOne(id, actor);
  }

  @Patch(':id')
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('lab.update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLabDto) {
    return this.labsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('lab.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.labsService.remove(id);
  }
}
