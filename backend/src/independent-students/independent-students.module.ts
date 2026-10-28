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
  controllers: [IndependentStudentsController, TumaPaymentsController],
  providers: [
    IndependentStudentsService,
    TumaPaymentProvider,
    TumaPaymentsService,
  ],
  exports: [IndependentStudentsService],
})
export class IndependentStudentsModule {}
