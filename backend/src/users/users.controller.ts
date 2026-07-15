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
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls (best-effort; exceljs reads xlsx format)
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

  // Registered ahead of the GET/PATCH ':id' routes purely for readability —
  // Nest/Express disambiguate by segment count so ordering isn't load-bearing
  // here (/users/import/template has 2 segments, /users/:id has 1).
  @Post('import')
  @Roles(Role.PLATFORM_ADMIN, Role.SCHOOL_ADMIN)
  @AuditAction('user.import')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async importUsers(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('Attach an .xlsx file under the "file" field');
    }
    if (!EXCEL_MIMETYPES.has(file.mimetype) && !file.originalname.match(/\.xlsx?$/i)) {
      throw new BadRequestException('Only .xlsx/.xls files are supported');
    }

    return this.usersImportService.importFromExcel(file.buffer, actor);
  }

  @Get('import/template')
  @Roles(Role.PLATFORM_ADMIN, Role.SCHOOL_ADMIN)
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.usersImportService.buildTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="assignments-hub-user-import-template.xlsx"',
    });
    res.send(buffer);
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
}
