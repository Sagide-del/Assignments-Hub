import { ScheduleModule } from "@nestjs/schedule";
import { TumaReconciliationService } from "./tuma-reconciliation.service";
import { TumaCallbackQueue } from "./tuma-callback-queue";
import { MpesaCallbackController } from "./mpesa-callback.controller";
import { TumaPaymentProvider } from "./tuma-payment.provider";
import { TumaPaymentsService } from "./tuma-payments.service";
import { TumaPaymentsController } from "./tuma-payments.controller";
import {
  JengaPaymentsController,
  JengaWebhookController,
} from "./jenga-payments.controller";
import { JengaAuthService } from "./jenga-auth.service";
import { JengaSignatureService } from "./jenga-signature.service";
import { JengaPaymentProvider } from "./jenga-payment.provider";
import { JengaPaymentsService } from "./jenga-payments.service";
import { Module } from "@nestjs/common";
import { IndependentStudentsController } from "./independent-students.controller";
import { IndependentStudentsService } from "./independent-students.service";
import { UsersModule } from "../users/users.module";
import { SmsModule } from "../sms/sms.module";

@Module({
  imports: [UsersModule, SmsModule, ScheduleModule.forRoot()],
  controllers: [
    IndependentStudentsController,
    TumaPaymentsController,
    MpesaCallbackController,
    JengaPaymentsController,
    JengaWebhookController,
  ],
  providers: [
    IndependentStudentsService,
    TumaPaymentProvider,
    TumaPaymentsService,
    TumaCallbackQueue,
    TumaReconciliationService,
    JengaAuthService,
    JengaSignatureService,
    JengaPaymentProvider,
    JengaPaymentsService,
  ],
  exports: [IndependentStudentsService],
})
export class IndependentStudentsModule {}
