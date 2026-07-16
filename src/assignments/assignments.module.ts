import { Module } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';
import { SubmissionsModule } from '../submissions/submissions.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [SubmissionsModule, SmsModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
