import { Module } from '@nestjs/common';
import { LearningCoachController } from './learning-coach.controller';
import { LearningCoachService } from './learning-coach.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  controllers: [LearningCoachController],
  providers: [LearningCoachService],
  imports: [UploadsModule],
})
export class LearningCoachModule {}
