import { AcquisitionController } from './acquisition.controller';
import { AcquisitionService } from './acquisition.service';
import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  controllers: [AnalyticsController, AcquisitionController],
  providers: [AnalyticsService, AcquisitionService],
})
export class AnalyticsModule {}
