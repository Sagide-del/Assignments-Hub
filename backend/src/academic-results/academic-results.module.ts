import { Module } from '@nestjs/common';
import { AcademicResultsController } from './academic-results.controller';
import { AcademicResultsService } from './academic-results.service';

@Module({
  controllers: [AcademicResultsController],
  providers: [AcademicResultsService],
})
export class AcademicResultsModule {}
