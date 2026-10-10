import { Module } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { SmsModule } from '../sms/sms.module';
import { AssignmentDeliveryModule } from '../assignment-delivery/assignment-delivery.module';

@Module({
  imports: [SmsModule, AssignmentDeliveryModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
