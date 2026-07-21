import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { PaymentService } from './payment.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditAction } from '../common/decorators/audit.decorator';
import { OptionalParseIntPipe } from '../common/pipes/optional-parse-int.pipe';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateSubscriptionPaymentDto } from './dto/create-subscription-payment.dto';
import { CreateEquityPaymentDto } from './dto/create-equity-payment.dto';
import { CreateMpesaPaymentDto } from './dto/create-mpesa-payment.dto';
import { ReviewPaymentTransactionDto } from './dto/review-payment-transaction.dto';
import { PLAN_TIERS } from '../common/config/plans';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // The pricing table itself — tier bands and day/boarding rates. Public so
  // it can be shown on a marketing/pricing page before anyone logs in.
  @Get('tiers')
  @Public()
  getTiers() {
    return { tiers: PLAN_TIERS };
  }

  // What a specific school would pay right now, computed live from its
  // registered student count and declared type — no checkout started.
  // SCHOOL_ADMIN always sees their own school (TenantGuard enforces this if
  // they pass a schoolId that isn't theirs); PLATFORM_ADMIN must specify one.
  @Get('pricing')
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  async getPricing(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('schoolId', new OptionalParseIntPipe()) schoolId?: number,
  ) {
    const targetSchoolId = actor.role === Role.PLATFORM_ADMIN ? schoolId : actor.schoolId;
    if (!targetSchoolId) {
      throw new BadRequestException('schoolId is required');
    }
    return this.paymentService.getPricingForSchool(targetSchoolId);
  }

  @Get('providers')
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  async getProviders() {
    return this.paymentService.getPaymentProviders();
  }

  @Get('subscription/current')
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  async getCurrentSubscription(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('schoolId', new OptionalParseIntPipe()) schoolId?: number,
  ) {
    return this.paymentService.getCurrentSubscription(actor, schoolId);
  }

  @Get('invoices')
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  async getInvoices(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('schoolId', new OptionalParseIntPipe()) schoolId?: number,
  ) {
    return this.paymentService.getInvoices(actor, schoolId);
  }

  @Get('invoices/:id/download')
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  async downloadInvoice(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const invoice = await this.paymentService.downloadInvoice(id, actor);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.fileName}"`);
    res.send(invoice.buffer);
  }

  @Get('transactions')
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  async getTransactions(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('schoolId', new OptionalParseIntPipe()) schoolId?: number,
    @Query('status') status?: PaymentStatus,
    @Query('method') method?: PaymentMethod,
  ) {
    return this.paymentService.getTransactions(actor, { schoolId, status, method });
  }

  // Only billing-capable roles may kick off a real charge. TenantGuard
  // (global) additionally enforces that a non-platform-admin's schoolId in
  // the body matches their own school.
  @Post('create')
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  @AuditAction('payment.create')
  async createPayment(@Body() dto: CreatePaymentDto) {
    return this.paymentService.createPayment(dto.email, dto.schoolId);
  }

  @Post('subscription')
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  @AuditAction('payment.subscription_create')
  async createSubscription(@Body() dto: CreateSubscriptionPaymentDto) {
    return this.paymentService.createSubscription(dto.email, dto.schoolId, dto.interval || 'monthly');
  }

  @Post('equity-paybill')
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  @AuditAction('payment.equity_paybill_submit')
  async createEquityPaybillPayment(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateEquityPaymentDto,
  ) {
    return this.paymentService.createEquityPaybillPayment(actor, dto);
  }

  @Post('mpesa')
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  @AuditAction('payment.mpesa_create')
  async createMpesaPayment(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateMpesaPaymentDto) {
    return this.paymentService.createMpesaPayment(actor, dto);
  }

  @Get('verify')
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  async verifyPayment(@Query('invoiceId') invoiceId: string) {
    return this.paymentService.verifyPayment(invoiceId);
  }

  @Patch('transactions/:id/approve')
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('payment.transaction_approve')
  async approveTransaction(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.paymentService.approveTransaction(id, actor);
  }

  @Patch('transactions/:id/reject')
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('payment.transaction_reject')
  async rejectTransaction(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: ReviewPaymentTransactionDto,
  ) {
    return this.paymentService.rejectTransaction(id, actor, dto.reason);
  }

  @Get('dashboard')
  @Roles(Role.PLATFORM_ADMIN)
  async getBillingDashboard() {
    return this.paymentService.getBillingDashboard();
  }

  @Get('reconciliation')
  @Roles(Role.PLATFORM_ADMIN)
  async getReconciliation() {
    return this.paymentService.getReconciliation();
  }

  @Get('ai-usage')
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  async getAiUsageVisibility(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('schoolId', new OptionalParseIntPipe()) schoolId?: number,
  ) {
    return this.paymentService.getAiUsageBillingVisibility(actor, schoolId);
  }

  @Get('publishable-key')
  @Public()
  async getPublishableKey() {
    return { key: this.paymentService.getPublishableKey() };
  }

  @Post('webhook')
  @Public()
  @AuditAction('payment.webhook_received')
  @HttpCode(HttpStatus.OK)
  async webhook(@Body() payload: any) {
    // IntaSend verifies via a `challenge` field inside the JSON body itself
    // (see payment.service.ts verifyWebhookChallenge), not a header.
    return this.paymentService.handleWebhook(payload);
  }
}
