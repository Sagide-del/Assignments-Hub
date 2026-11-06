import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import { AllowIndependentTrial } from "../common/decorators/allow-independent-trial.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { StartJengaPaymentDto } from "./dto/start-jenga-payment.dto";
import { JengaPaymentsService } from "./jenga-payments.service";

@Controller("independent-students/jenga")
export class JengaPaymentsController {
  constructor(private readonly payments: JengaPaymentsService) {}

  @Get("capabilities")
  @Public()
  capabilities() {
    return this.payments.capabilities();
  }

  @Post("stk-push")
  @Roles(Role.STUDENT)
  @AllowIndependentTrial()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  start(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: StartJengaPaymentDto,
  ) {
    return this.payments.start(actor, dto);
  }

  @Get("payment")
  @Roles(Role.STUDENT)
  @AllowIndependentTrial()
  latest(@CurrentUser() actor: AuthenticatedUser) {
    return this.payments.latest(actor);
  }
}

// The externally registered Jenga URL must target the API host, including
// the application's /api/v1 prefix: POST /api/v1/payments/jenga/callback.
@Controller("payments/jenga")
export class JengaWebhookController {
  constructor(private readonly payments: JengaPaymentsService) {}

  @Post("callback")
  @Public()
  @SkipThrottle()
  @HttpCode(200)
  callback(@Body() payload: unknown) {
    return this.payments.handleCallback(payload);
  }
}
