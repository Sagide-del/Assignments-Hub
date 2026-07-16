import { BadRequestException, Controller, Post, Body, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
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
import { PLAN_TIERS } from '../common/config/plans';

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

  @Get('verify')
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  async verifyPayment(@Query('invoiceId') invoiceId: string) {
    return this.paymentService.verifyPayment(invoiceId);
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
