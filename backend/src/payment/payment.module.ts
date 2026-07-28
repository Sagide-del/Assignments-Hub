import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { IntaSendPaymentProvider } from './providers/intasend-payment.provider';
import { MpesaPaymentProvider } from './providers/mpesa-payment.provider';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule],
  controllers: [PaymentController],
  providers: [PaymentService, IntaSendPaymentProvider, MpesaPaymentProvider],
  exports: [PaymentService],
})
export class PaymentModule {}
