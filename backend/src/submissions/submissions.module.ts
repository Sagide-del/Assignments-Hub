import { MathEngineModule } from "../math-engine/math-engine.module";
import { GradingService } from "../student/grading.service";
import { Module } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { SmsModule } from '../sms/sms.module';
import { AssignmentDeliveryModule } from '../assignment-delivery/assignment-delivery.module';

@Module({
  imports: [SmsModule, AssignmentDeliveryModule, MathEngineModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, GradingService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
