import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateSkillCategoryDto } from './dto/create-skill-category.dto';
import { CreateSkillCourseDto } from './dto/create-skill-course.dto';
import { CreateSkillProviderDto } from './dto/create-skill-provider.dto';
import { CreateSkillEnrollmentDto, CreateSkillPaymentDto, UpdateSkillEnrollmentDto, UpdateSkillPaymentDto } from './dto/skill-enrollment.dto';
import { UpdateSkillCategoryDto, UpdateSkillCourseDto, UpdateSkillProviderDto } from './dto/update-skill.dto';
import { SkillsService } from './skills.service';

@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get('categories')
  categories(@CurrentUser() actor: AuthenticatedUser) {
    return this.skillsService.findCategories(actor);
  }

  @Post('categories')
  @Roles(Role.PLATFORM_ADMIN)
  createCategory(@Body() dto: CreateSkillCategoryDto) {
    return this.skillsService.createCategory(dto);
  }

  @Patch('categories/:id')
  @Roles(Role.PLATFORM_ADMIN)
  updateCategory(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSkillCategoryDto) {
    return this.skillsService.updateCategory(id, dto);
  }

  @Get('providers')
  providers(@CurrentUser() actor: AuthenticatedUser) {
    return this.skillsService.findProviders(actor);
  }

  @Post('providers')
  @Roles(Role.PLATFORM_ADMIN)
  createProvider(@Body() dto: CreateSkillProviderDto) {
    return this.skillsService.createProvider(dto);
  }

  @Patch('providers/:id')
  @Roles(Role.PLATFORM_ADMIN)
  updateProvider(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSkillProviderDto) {
    return this.skillsService.updateProvider(id, dto);
  }

  @Get('courses')
  courses(@CurrentUser() actor: AuthenticatedUser, @Query('categoryId') categoryId?: string) {
    return this.skillsService.findCourses(actor, categoryId ? Number(categoryId) : undefined);
  }

  @Get('courses/:id')
  course(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthenticatedUser) {
    return this.skillsService.findCourse(id, actor);
  }

  @Post('courses')
  @Roles(Role.PLATFORM_ADMIN)
  createCourse(@Body() dto: CreateSkillCourseDto) {
    return this.skillsService.createCourse(dto);
  }

  @Patch('courses/:id')
  @Roles(Role.PLATFORM_ADMIN)
  updateCourse(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSkillCourseDto) {
    return this.skillsService.updateCourse(id, dto);
  }

  @Delete('courses/:id')
  @Roles(Role.PLATFORM_ADMIN)
  removeCourse(@Param('id', ParseIntPipe) id: number) {
    return this.skillsService.removeCourse(id);
  }

  @Post('enrollments')
  @Roles(Role.STUDENT)
  enroll(@Body() dto: CreateSkillEnrollmentDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.skillsService.requestEnrollment(dto.courseId, actor);
  }

  @Get('enrollments/student')
  @Roles(Role.STUDENT)
  studentEnrollments(@CurrentUser() actor: AuthenticatedUser) {
    return this.skillsService.findStudentEnrollments(actor);
  }

  @Get('enrollments')
  @Roles(Role.PLATFORM_ADMIN)
  enrollments() {
    return this.skillsService.findAllEnrollments();
  }

  @Patch('enrollments/:id')
  @Roles(Role.PLATFORM_ADMIN)
  updateEnrollment(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSkillEnrollmentDto) {
    return this.skillsService.updateEnrollment(id, dto);
  }

  @Get('payments')
  @Roles(Role.PLATFORM_ADMIN)
  payments() {
    return this.skillsService.findPayments();
  }

  @Post('payments')
  @Roles(Role.PLATFORM_ADMIN)
  createPayment(@Body() dto: CreateSkillPaymentDto) {
    return this.skillsService.createPayment(dto);
  }

  @Patch('payments/:id')
  @Roles(Role.PLATFORM_ADMIN)
  updatePayment(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSkillPaymentDto) {
    return this.skillsService.updatePayment(id, dto);
  }

  @Get('admin/summary')
  @Roles(Role.PLATFORM_ADMIN)
  adminSummary() {
    return this.skillsService.getAdminSummary();
  }
}
