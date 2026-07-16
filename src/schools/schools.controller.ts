import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditAction } from '../common/decorators/audit.decorator';

@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Post()
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('school.create')
  create(@Body() dto: CreateSchoolDto) {
    return this.schoolsService.create(dto);
  }

  @Get()
  @Roles(Role.PLATFORM_ADMIN)
  findAll() {
    return this.schoolsService.findAll();
  }

  @Get(':id')
  @Roles(Role.PLATFORM_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.schoolsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.PLATFORM_ADMIN, Role.SCHOOL_ADMIN)
  @AuditAction('school.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSchoolDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.schoolsService.update(id, dto, user);
  }
}
