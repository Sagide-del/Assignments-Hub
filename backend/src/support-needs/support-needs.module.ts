import { Module } from '@nestjs/common';
import { SupportNeedsController } from './support-needs.controller';
import { SupportNeedsService } from './support-needs.service';

@Module({
  controllers: [SupportNeedsController],
  providers: [SupportNeedsService],
  exports: [SupportNeedsService],
})
export class SupportNeedsModule {}
