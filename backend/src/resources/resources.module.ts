import { Module } from '@nestjs/common';
import { PaymentModule } from '../payment/payment.module';
import { UploadsModule } from '../uploads/uploads.module';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';

@Module({
  imports: [PaymentModule, UploadsModule],
  controllers: [ResourcesController],
  providers: [ResourcesService],
})
export class ResourcesModule {}
