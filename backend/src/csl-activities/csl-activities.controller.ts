import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { CslActivitiesService } from './csl-activities.service';
import { CreateCslActivityDto } from './dto/create-csl-activity.dto';
import { UpdateCslActivityDto } from './dto/update-csl-activity.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditAction } from '../common/decorators/audit.decorator';

@Controller('csl-activities')
export class CslActivitiesController {
  constructor(private readonly cslActivitiesService: CslActivitiesService) {}

  @Post()
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('csl_activity.create')
  create(@Body() dto: CreateCslActivityDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.cslActivitiesService.create(dto, actor);
  }

  // Any authenticated role can browse — students on the STEM Labs page's
  // CSL tab (auto-scoped to their own grade), staff to see what's required.
  @Get()
  findAll(@CurrentUser() actor: AuthenticatedUser, @Query('grade') grade?: string) {
    return this.cslActivitiesService.findAll(actor, grade);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cslActivitiesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('csl_activity.update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCslActivityDto) {
    return this.cslActivitiesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('csl_activity.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cslActivitiesService.remove(id);
  }
}
