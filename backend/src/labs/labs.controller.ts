import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { LabsService } from './labs.service';
import { CreateLabDto } from './dto/create-lab.dto';
import { UpdateLabDto } from './dto/update-lab.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditAction } from '../common/decorators/audit.decorator';
import { CreateLabMediaBatchDto } from './dto/create-lab-media-batch.dto';
import { CreateLabStepsBatchDto } from './dto/create-lab-steps-batch.dto';
import { CreateLabReflectionsBatchDto } from './dto/create-lab-reflections-batch.dto';

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

  @Get(':id/cms')
  @Roles(Role.PLATFORM_ADMIN)
  findOneCms(@Param('id', ParseIntPipe) id: number) {
    return this.labsService.findOneCms(id);
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

  @Post(':id/media')
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('lab.media.create')
  addMedia(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateLabMediaBatchDto) {
    return this.labsService.addMedia(id, dto);
  }

  @Post(':id/steps')
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('lab.steps.create')
  addSteps(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateLabStepsBatchDto) {
    return this.labsService.addSteps(id, dto);
  }

  @Post(':id/reflections')
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('lab.reflections.create')
  addReflections(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateLabReflectionsBatchDto) {
    return this.labsService.addReflections(id, dto);
  }
}
