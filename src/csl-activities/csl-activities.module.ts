import { Module } from '@nestjs/common';
import { CslActivitiesController } from './csl-activities.controller';
import { CslActivitiesService } from './csl-activities.service';

@Module({
  controllers: [CslActivitiesController],
  providers: [CslActivitiesService],
  exports: [CslActivitiesService],
})
export class CslActivitiesModule {}
