import { Module } from '@nestjs/common';
import { SmsModule } from '../sms/sms.module';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';

@Module({
  imports: [SmsModule],
  controllers: [SkillsController],
  providers: [SkillsService],
})
export class SkillsModule {}
