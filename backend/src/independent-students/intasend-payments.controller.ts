import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  RawBodyRequest,
  Req,
} from "@nestjs/common";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { AllowIndependentTrial } from "../common/decorators/allow-independent-trial.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { StartIntasendPaymentDto } from "./dto/start-intasend-payment.dto";
import { IntasendPaymentsService } from "./intasend-payments.service";
@Controller("independent-students/intasend")
export class IntasendPaymentsController {
  constructor(private readonly payments: IntasendPaymentsService) {}
  @Public() @Get("capabilities") capabilities() {
    return this.payments.capabilities();
  }
  @Post("stk-push")
  @Roles(Role.STUDENT)
  @AllowIndependentTrial()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  start(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: StartIntasendPaymentDto,
  ) {
    return this.payments.start(actor, dto);
  }
  @Get("payment") @Roles(Role.STUDENT) @AllowIndependentTrial() latest(
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.payments.latest(actor);
  }
}
@Controller("payments/intasend")
export class IntasendWebhookController {
  constructor(private readonly payments: IntasendPaymentsService) {}
  @Post("callback")
  @Public()
  @SkipThrottle()
  @HttpCode(200)
  callback(@Body() payload: unknown, @Req() req: RawBodyRequest<Request>) {
    return this.payments.callback(
      payload,
      req.rawBody?.toString("utf8") ?? JSON.stringify(payload),
    );
  }
}
