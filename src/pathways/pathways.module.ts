import { Module } from '@nestjs/common';
import { PathwaysController } from './pathways.controller';
import { PathwaysService } from './pathways.service';
import { PathwaysReportController } from './pathways-report.controller';
import { PathwaysReportService } from './pathways-report.service';

@Module({
  controllers: [PathwaysController, PathwaysReportController],
  providers: [PathwaysService, PathwaysReportService],
  exports: [PathwaysService],
})
export class PathwaysModule {}
