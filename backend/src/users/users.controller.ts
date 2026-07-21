import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { UsersService } from './users.service';
import { UsersImportService } from './users-import.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditAction } from '../common/decorators/audit.decorator';
import { OptionalParseIntPipe } from '../common/pipes/optional-parse-int.pipe';

const EXCEL_MIMETYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersImportService: UsersImportService,
  ) {}

  @Post()
  @Roles(Role.PLATFORM_ADMIN, Role.SCHOOL_ADMIN)
  @AuditAction('user.create')
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.create(dto, actor);
  }

  @Post('import')
  @Roles(Role.PLATFORM_ADMIN, Role.SCHOOL_ADMIN)
  @AuditAction('user.import')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async importUsers(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    this.assertImportFile(file);
    return this.usersImportService.importFromExcel(file.buffer, actor);
  }

  @Post('import/students/preview')
  @Roles(Role.PLATFORM_ADMIN, Role.SCHOOL_ADMIN)
  @AuditAction('user.import.students.preview')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async previewStudents(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    this.assertImportFile(file);
    return this.usersImportService.previewStudentsFromExcel(file.buffer, actor);
  }

  @Post('import/students')
  @Roles(Role.PLATFORM_ADMIN, Role.SCHOOL_ADMIN)
  @AuditAction('user.import.students')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async importStudents(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    this.assertImportFile(file);
    return this.usersImportService.importStudentsFromExcel(file.buffer, actor);
  }

  @Post('import/teachers/preview')
  @Roles(Role.PLATFORM_ADMIN, Role.SCHOOL_ADMIN)
  @AuditAction('user.import.teachers.preview')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async previewTeachers(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    this.assertImportFile(file);
    return this.usersImportService.previewTeachersFromExcel(file.buffer, actor);
  }

  @Post('import/teachers')
  @Roles(Role.PLATFORM_ADMIN, Role.SCHOOL_ADMIN)
  @AuditAction('user.import.teachers')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async importTeachers(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    this.assertImportFile(file);
    return this.usersImportService.importTeachersFromExcel(file.buffer, actor);
  }

  @Get('import/template')
  @Roles(Role.PLATFORM_ADMIN, Role.SCHOOL_ADMIN)
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.usersImportService.buildTemplate();
    this.sendWorkbook(res, buffer, 'assignments-hub-user-import-template.xlsx');
  }

  @Get('import/template/students')
  @Roles(Role.PLATFORM_ADMIN, Role.SCHOOL_ADMIN)
  async downloadStudentTemplate(@Res() res: Response) {
    const buffer = await this.usersImportService.buildStudentTemplate();
    this.sendWorkbook(res, buffer, 'assignments-hub-student-import-template.xlsx');
  }

  @Get('import/template/teachers')
  @Roles(Role.PLATFORM_ADMIN, Role.SCHOOL_ADMIN)
  async downloadTeacherTemplate(@Res() res: Response) {
    const buffer = await this.usersImportService.buildTeacherTemplate();
    this.sendWorkbook(res, buffer, 'assignments-hub-teacher-import-template.xlsx');
  }

  @Get()
  @Roles(Role.PLATFORM_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER)
  findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('schoolId', new OptionalParseIntPipe()) schoolId?: number,
  ) {
    return this.usersService.findAll(actor, schoolId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.findOne(id, actor);
  }

  @Patch(':id')
  @AuditAction('user.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.update(id, dto, actor);
  }

  private assertImportFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Attach an .xlsx file under the "file" field');
    }
    if (!EXCEL_MIMETYPES.has(file.mimetype) && !file.originalname.match(/\.xlsx?$/i)) {
      throw new BadRequestException('Only .xlsx/.xls files are supported');
    }
  }

  private sendWorkbook(res: Response, buffer: Buffer, filename: string) {
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }
}
