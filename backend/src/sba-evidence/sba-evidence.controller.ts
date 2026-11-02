import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditAction } from '../common/decorators/audit.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateSbaEvidenceDto } from './dto/create-sba-evidence.dto';
import { ReviewSbaEvidenceDto } from './dto/review-sba-evidence.dto';
import { SbaEvidenceService } from './sba-evidence.service';

@Controller('sba-evidence')
export class SbaEvidenceController {
  constructor(private readonly evidence: SbaEvidenceService) {}

  @Get()
  list(@CurrentUser() actor: AuthenticatedUser) { return this.evidence.list(actor); }

  @Post()
  @Roles(Role.STUDENT)
  @AuditAction('sba_evidence.create')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  create(@Body() dto: CreateSbaEvidenceDto, @UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() actor: AuthenticatedUser) {
    return this.evidence.create(dto, file, actor);
  }

  @Patch(':id/review')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  @AuditAction('sba_evidence.review')
  review(@Param('id', ParseIntPipe) id: number, @Body() dto: ReviewSbaEvidenceDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.evidence.review(id, dto, actor);
  }
}
