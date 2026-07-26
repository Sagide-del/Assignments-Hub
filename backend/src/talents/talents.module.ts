import { Module } from '@nestjs/common';
import { TalentsController } from './talents.controller';
import { TalentsService } from './talents.service';

@Module({
  controllers: [TalentsController],
  providers: [TalentsService],
  exports: [TalentsService],
})
export class TalentsModule {}
