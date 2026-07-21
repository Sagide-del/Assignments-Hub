import { Module } from '@nestjs/common';
import { StemController } from './stem.controller';
import { StemService } from './stem.service';

@Module({
  controllers: [StemController],
  providers: [StemService],
})
export class StemModule {}
