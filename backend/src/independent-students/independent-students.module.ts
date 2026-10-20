import { Module } from '@nestjs/common';
import { IndependentStudentsController } from './independent-students.controller';
import { IndependentStudentsService } from './independent-students.service';
import { UsersModule } from '../users/users.module';
import { SmsModule } from '../sms/sms.module';
import { PaystackPaymentProvider } from '../payment/providers/paystack-payment.provider';

@Module({
  imports: [UsersModule, SmsModule],
  controllers: [IndependentStudentsController],
  providers: [IndependentStudentsService, PaystackPaymentProvider],
  // PaymentService verifies Paystack learner payments through this service.
  exports: [IndependentStudentsService],
})
export class IndependentStudentsModule {}
