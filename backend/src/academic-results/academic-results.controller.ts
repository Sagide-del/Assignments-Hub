import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditAction } from '../common/decorators/audit.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AcademicResultsService } from './academic-results.service';
import { ImportAcademicResultsDto } from './dto/import-academic-results.dto';

@Controller('academic-results')
export class AcademicResultsController {
  constructor(private readonly academicResults: AcademicResultsService) {}

  @Get('template')
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  async template(@Res() response: Response) {
    const buffer = await this.academicResults.template();
    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.setHeader('Content-Disposition', 'attachment; filename="academic-results-template.xlsx"');
    response.send(buffer);
  }

  @Post('import')
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  @AuditAction('academic_results.import')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      const allowed = new Set([
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        'application/csv',
      ]);
      const supportedExtension = /\.(xlsx|xls|csv)$/i.test(file.originalname);
      if (!allowed.has(file.mimetype) && !supportedExtension) {
        callback(new BadRequestException('Upload an Excel .xlsx or CSV file'), false);
        return;
      }
      callback(null, true);
    },
  }))
  import(@UploadedFile() file: Express.Multer.File, @Body() dto: ImportAcademicResultsDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.academicResults.import(file, dto, actor);
  }

  @Get('batches')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  batches(@CurrentUser() actor: AuthenticatedUser) {
    return this.academicResults.batches(actor);
  }

  @Get('me/plan')
  @Roles(Role.STUDENT)
  studentPlan(@CurrentUser() actor: AuthenticatedUser) {
    return this.academicResults.studentPlan(actor);
  }

  @Get('batches/:id/analysis')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  analysis(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthenticatedUser) {
    return this.academicResults.analysis(id, actor);
  }

  @Get('batches/:id/report.pdf')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  async report(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthenticatedUser, @Res() response: Response) {
    const report = await this.academicResults.reportPdf(id, actor);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
    response.send(report.buffer);
  }
}
