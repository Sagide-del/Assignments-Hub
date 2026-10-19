import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { IntaSendPaymentProvider } from './providers/intasend-payment.provider';
import { MpesaPaymentProvider } from './providers/mpesa-payment.provider';
import { PaystackPaymentProvider } from './providers/paystack-payment.provider';
import { UploadsModule } from '../uploads/uploads.module';
import { IndependentStudentsModule } from '../independent-students/independent-students.module';

@Module({
  imports: [UploadsModule, IndependentStudentsModule],
  controllers: [PaymentController],
  providers: [PaymentService, IntaSendPaymentProvider, MpesaPaymentProvider, PaystackPaymentProvider],
  exports: [PaymentService, PaystackPaymentProvider],
})
export class PaymentModule {}
