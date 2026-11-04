import { TumaCallbackQueue } from "./tuma-callback-queue";
import { MpesaCallbackController } from "./mpesa-callback.controller";
import { TumaPaymentProvider } from "./tuma-payment.provider";
import { TumaPaymentsService } from "./tuma-payments.service";
import { TumaPaymentsController } from "./tuma-payments.controller";
import { Module } from "@nestjs/common";
import { IndependentStudentsController } from "./independent-students.controller";
import { IndependentStudentsService } from "./independent-students.service";
import { UsersModule } from "../users/users.module";
import { SmsModule } from "../sms/sms.module";

@Module({
  imports: [UsersModule, SmsModule],
  controllers: [
    IndependentStudentsController,
    TumaPaymentsController,
    MpesaCallbackController,
  ],
  providers: [
    IndependentStudentsService,
    TumaPaymentProvider,
    TumaPaymentsService,
    TumaCallbackQueue,
  ],
  exports: [IndependentStudentsService],
})
export class IndependentStudentsModule {}
