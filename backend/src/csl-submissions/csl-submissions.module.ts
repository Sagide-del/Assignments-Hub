import { Module } from '@nestjs/common';
import { CslSubmissionsController } from './csl-submissions.controller';
import { CslSubmissionsService } from './csl-submissions.service';

@Module({
  controllers: [CslSubmissionsController],
  providers: [CslSubmissionsService],
  exports: [CslSubmissionsService],
})
export class CslSubmissionsModule {}
