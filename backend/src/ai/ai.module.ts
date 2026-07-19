import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { DeepseekService } from './deepseek.service';

@Module({
  controllers: [
    AiController,
  ],
  providers: [
    AiService,
    DeepseekService,
  ],
  exports: [
    AiService,
  ],
})
export class AiModule {}