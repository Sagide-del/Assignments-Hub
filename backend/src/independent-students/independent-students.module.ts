import { Module } from '@nestjs/common';
import { IndependentStudentsController } from './independent-students.controller';
import { IndependentStudentsService } from './independent-students.service';
import { UsersModule } from '../users/users.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [UsersModule, SmsModule],
  controllers: [IndependentStudentsController],
  providers: [IndependentStudentsService],
})
export class IndependentStudentsModule {}
