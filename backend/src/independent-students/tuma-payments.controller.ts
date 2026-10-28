import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Roles } from "../common/decorators/roles.decorator";
import { Public } from "../common/decorators/public.decorator";
import { AllowIndependentTrial } from "../common/decorators/allow-independent-trial.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { TumaPaymentsService } from "./tuma-payments.service";
import { StartTumaPaymentDto } from "./dto/start-tuma-payment.dto";
@Controller("independent-students/tuma")
export class TumaPaymentsController {
  constructor(private readonly payments: TumaPaymentsService) {}
  @Get("capabilities") @Public() capabilities() {
    return this.payments.capabilities();
  }
  @Post("stk-push")
  @Roles(Role.STUDENT)
  @AllowIndependentTrial()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  start(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: StartTumaPaymentDto,
  ) {
    return this.payments.start(actor, dto);
  }
  @Get("payment")
  @Roles(Role.STUDENT)
  @AllowIndependentTrial()
  latest(@CurrentUser() actor: AuthenticatedUser) {
    return this.payments.latest(actor);
  }
  @Post("callback/:reference/:token")
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  callback(
    @Param("reference") reference: string,
    @Param("token") token: string,
    @Body() payload: unknown,
  ) {
    return this.payments.callback(reference, token, payload);
  }
}
