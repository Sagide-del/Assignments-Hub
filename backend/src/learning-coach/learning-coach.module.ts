import { Module } from '@nestjs/common';
import { LearningCoachController } from './learning-coach.controller';
import { LearningCoachService } from './learning-coach.service';

@Module({
  controllers: [LearningCoachController],
  providers: [LearningCoachService],
})
export class LearningCoachModule {}
