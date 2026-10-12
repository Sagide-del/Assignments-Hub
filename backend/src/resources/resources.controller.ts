import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditAction } from '../common/decorators/audit.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { UploadsService } from '../uploads/uploads.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { PurchaseResourceDto } from './dto/purchase-resource.dto';
import { ReviewResourcePurchaseDto } from './dto/review-resource-purchase.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ResourcesService } from './resources.service';

@Controller('resources')
export class ResourcesController {
  constructor(
    private readonly resources: ResourcesService,
    private readonly uploads: UploadsService,
  ) {}

  @Get()
  @Roles(Role.STUDENT, Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('type') type?: string,
    @Query('subject') subject?: string,
    @Query('search') search?: string,
  ) {
    return this.resources.findAll(actor, { type, subject, search });
  }

  @Get('payment-options')
  @Roles(Role.STUDENT)
  paymentOptions() {
    return this.resources.getPaymentOptions();
  }

  @Get('my-listings')
  @Roles(Role.TEACHER, Role.PLATFORM_ADMIN)
  myListings(@CurrentUser() actor: AuthenticatedUser) {
    return this.resources.myListings(actor);
  }

  @Get('seller/summary')
  @Roles(Role.TEACHER, Role.PLATFORM_ADMIN)
  sellerSummary(@CurrentUser() actor: AuthenticatedUser) {
    return this.resources.sellerSummary(actor);
  }

  @Get('my-purchases')
  @Roles(Role.STUDENT)
  myPurchases(@CurrentUser() actor: AuthenticatedUser) {
    return this.resources.myPurchases(actor);
  }

  @Get('admin/purchases')
  @Roles(Role.PLATFORM_ADMIN)
  purchases() {
    return this.resources.adminPurchases();
  }

  @Post('upload')
  @Roles(Role.TEACHER, Role.PLATFORM_ADMIN)
  @AuditAction('resource.file_upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      if (file.mimetype !== 'application/pdf') {
        callback(new BadRequestException('Marketplace learning files must be PDF documents'), false);
        return;
      }
      callback(null, true);
    },
  }))
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Select a PDF file');
    return this.uploads.uploadPrivate(file);
  }

  @Post()
  @Roles(Role.TEACHER, Role.PLATFORM_ADMIN)
  @AuditAction('resource.create')
  create(@Body() dto: CreateResourceDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.resources.create(dto, actor);
  }

  @Patch(':id')
  @Roles(Role.TEACHER, Role.PLATFORM_ADMIN)
  @AuditAction('resource.update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateResourceDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.resources.update(id, dto, actor);
  }

  @Post(':id/publish')
  @Roles(Role.TEACHER, Role.PLATFORM_ADMIN)
  @AuditAction('resource.publish')
  publish(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthenticatedUser) {
    return this.resources.publish(id, actor);
  }

  @Delete(':id')
  @Roles(Role.TEACHER, Role.PLATFORM_ADMIN)
  @AuditAction('resource.archive')
  archive(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthenticatedUser) {
    return this.resources.archive(id, actor);
  }

  @Post(':id/purchase')
  @Roles(Role.STUDENT)
  @AuditAction('resource.purchase_submit')
  purchase(@Param('id', ParseIntPipe) id: number, @Body() dto: PurchaseResourceDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.resources.purchase(id, dto, actor);
  }

  @Post('purchases/:id/review')
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('resource.purchase_review')
  reviewPurchase(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewResourcePurchaseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.resources.reviewPurchase(id, dto, actor);
  }

  @Get(':id/download')
  @Roles(Role.STUDENT, Role.TEACHER, Role.PLATFORM_ADMIN)
  download(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthenticatedUser) {
    return this.resources.download(id, actor);
  }

  @Get(':id')
  @Roles(Role.STUDENT, Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthenticatedUser) {
    return this.resources.findOne(id, actor);
  }
}
