import { Module } from '@nestjs/common';
import { LabSessionsService } from './lab-sessions.service';
import { LabSessionsController } from './lab-sessions.controller';

@Module({
  controllers: [LabSessionsController],
  providers: [LabSessionsService],
  exports: [LabSessionsService],
})
export class LabSessionsModule {}
