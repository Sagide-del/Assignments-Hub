import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiProviderRouterService } from './ai-provider-router.service';
import { AiService } from './ai.service';
import { AiUsageService } from './ai-usage.service';
import { OpenaiService } from './openai.service';

@Module({
  controllers: [
    AiController,
  ],
  providers: [
    AiService,
    OpenaiService,
    AiUsageService,
    AiProviderRouterService,
  ],
  exports: [
    AiService,
    AiProviderRouterService,
    AiUsageService,
  ],
})
export class AiModule {}
