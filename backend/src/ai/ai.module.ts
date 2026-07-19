import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiProviderRouterService } from './ai-provider-router.service';
import { AiService } from './ai.service';
import { DeepseekService } from './deepseek.service';

@Module({
  controllers: [
    AiController,
  ],
  providers: [
    AiService,
    DeepseekService,
    AiProviderRouterService,
  ],
  exports: [
    AiService,
  ],
})
export class AiModule {}
