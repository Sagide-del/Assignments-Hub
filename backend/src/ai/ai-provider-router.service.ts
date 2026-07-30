import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { AiUsageStatus } from '@prisma/client';

import { AiUsageService } from './ai-usage.service';
import { OpenaiService } from './openai.service';
import { AiProviderError } from './errors/ai-provider.error';
import { AiGenerationResult } from './interfaces/ai-provider.interface';

/**
 * Optional caller context, used only for AI usage logging (AiUsageService).
 * Both fields are optional because not every current call site supplies
 * them yet — AiService's existing call, generateAssignment(prompt) with no
 * second argument, still works unchanged. When schoolId is missing,
 * AiUsageService.record skips persisting that attempt (AiUsageLog.schoolId
 * is required in the schema) instead of writing an invalid row.
 */
export interface GenerateAssignmentContext {
  schoolId?: number | null;
  userId?: number | null;
}

/**
 * AI Provider Router.
 *
 *   Teacher/Platform-Admin flow -> AiService / QuestionBankService -> AI
 *   Provider Router (this class) -> OpenAI.
 *
 * OpenAI is the sole provider (previously DeepSeek-primary/Claude-fallback —
 * that dual-provider chain and its retryable-error fallback logic were
 * removed as part of the OpenAI migration; OpenAI's own SDK-level retry
 * behavior plus the AiQueueService/BullMQ retry wrapper around callers is
 * considered sufficient reliability without a second provider to fail over
 * to).
 *
 * Every attempt (success or failure) is still recorded to AiUsageLog via
 * AiUsageService — logging is fire-and-forget (not awaited), so a slow or
 * failing usage write can never add latency to, or break, the actual
 * generation response.
 *
 * Before the provider is called, generateAssignment checks the school's
 * monthly AI usage quota (AiUsageService.assertWithinMonthlyLimit). Unlike
 * usage logging, this check IS awaited and DOES throw (ForbiddenException)
 * — an over-quota school must never reach OpenAI. The check only runs when
 * context.schoolId is supplied.
 */
@Injectable()
export class AiProviderRouterService {
  private readonly logger = new Logger(AiProviderRouterService.name);

  constructor(
    private readonly openaiService: OpenaiService,
    private readonly aiUsageService: AiUsageService,
  ) {}

  async generateAssignment(
    prompt: string,
    context?: GenerateAssignmentContext,
  ): Promise<AiGenerationResult> {
    if (context?.schoolId != null) {
      // Throws ForbiddenException if this school is already at its monthly
      // quota. Intentionally BEFORE the provider call below, and awaited
      // (unlike usage logging further down), so an over-quota school incurs
      // no OpenAI call at all.
      await this.aiUsageService.assertWithinMonthlyLimit(context.schoolId);
    }

    try {
      const result = await this.openaiService.generateAssignment(prompt);

      void this.aiUsageService.record({
        schoolId: context?.schoolId,
        userId: context?.userId,
        provider: this.openaiService.providerName,
        status: AiUsageStatus.SUCCESS,
        model: result.model,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens,
      });

      return result;
    } catch (err) {
      const aiError =
        err instanceof AiProviderError
          ? err
          : new AiProviderError(
              'OPENAI',
              'UNKNOWN',
              (err as Error)?.message ?? 'Unknown AI provider error',
              false,
            );

      this.logger.warn(`OpenAI generation failed (${aiError.reason}): ${aiError.message}`);

      void this.aiUsageService.record({
        schoolId: context?.schoolId,
        userId: context?.userId,
        provider: this.openaiService.providerName,
        status: AiUsageStatus.FAILED,
        errorMessage: `${aiError.reason}: ${aiError.message}`,
      });

      throw new ServiceUnavailableException(
        `AI assignment generation is temporarily unavailable (${aiError.reason}). Please try again shortly.`,
      );
    }
  }
}
