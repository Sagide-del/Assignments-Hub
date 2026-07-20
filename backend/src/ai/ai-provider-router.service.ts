import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { AiUsageStatus } from '@prisma/client';

import { AiUsageService } from './ai-usage.service';
import { ClaudeService } from './claude.service';
import { DeepseekService } from './deepseek.service';
import { AiProviderError, AiProviderErrorReason } from './errors/ai-provider.error';
import { AiGenerationResult, AiProviderService } from './interfaces/ai-provider.interface';

/**
 * Optional caller context, used only for AI usage logging (AiUsageService).
 * Both fields are optional because not every current call site supplies
 * them yet — AiService's existing call, generateAssignment(prompt) with no
 * second argument, still works unchanged. When schoolId is missing,
 * AiUsageService.record skips persisting that attempt (AiUsageLog.schoolId
 * is required in the schema) instead of writing an invalid row. Wiring a
 * real schoolId/userId through from AiService is a separate, follow-up
 * change — out of scope here.
 */
export interface GenerateAssignmentContext {
  schoolId?: number | null;
  userId?: number | null;
}

/**
 * AI Provider Router.
 *
 *   Teacher Dashboard -> AI Assignment Service (AiService) -> AI Provider
 *   Router (this class) -> DeepSeek (primary) / Claude (fallback)
 *
 * Chain: [DeepSeek, Claude]. DeepSeek is tried first; Claude is only tried
 * when DeepSeek fails for a retryable reason (balance exhausted, rate
 * limited, or unavailable) — anything else surfaces immediately.
 *
 * Every attempt (either provider, success or failure) is recorded to
 * AiUsageLog via AiUsageService — see the try/catch in generateAssignment.
 * Logging is fire-and-forget (not awaited), matching AuditLogInterceptor's
 * pattern, so a slow or failing usage write can never add latency to, or
 * break, the actual generation response.
 *
 * Before either provider is tried, generateAssignment checks the school's
 * monthly AI usage quota (AiUsageService.assertWithinMonthlyLimit). Unlike
 * usage logging, this check IS awaited and DOES throw (ForbiddenException)
 * — an over-quota school must never reach DeepSeek or Claude. The check
 * only runs when context.schoolId is supplied; call sites without a school
 * in scope skip enforcement entirely, matching the same
 * optional-context/backward-compatible pattern usage logging already uses.
 *
 * Scope note for this change: deepseek.service.ts is intentionally
 * untouched in this change. AiService was already migrated to use
 * AiProviderRouterService in the previous provider-router integration.
 *  - DeepseekService still throws a plain InternalServerErrorException
 *    with only a message string, not the typed AiProviderError the other
 *    providers use. `deepseekAdapter` below wraps it to satisfy the shared
 *    AiProviderService contract, without modifying deepseek.service.ts —
 *    see classifyDeepseekError for how (and where) that's an approximation.
 *  - ClaudeService already implements AiProviderService natively, so it's
 *    used directly with no adapter.
 *  - AiService routes generation requests through this provider router.
 *    This router preserves the existing API response contract while
 *    adding provider fallback support.
 */
@Injectable()
export class AiProviderRouterService {
  private readonly logger = new Logger(AiProviderRouterService.name);

  private readonly chain: AiProviderService[];

  constructor(
    private readonly deepseekService: DeepseekService,
    private readonly claudeService: ClaudeService,
    private readonly aiUsageService: AiUsageService,
  ) {
    const deepseekAdapter: AiProviderService = {
      providerName: 'DEEPSEEK',
      generateAssignment: async (prompt: string): Promise<AiGenerationResult> => {
        try {
          const content = await this.deepseekService.generateAssignment(prompt);

          return {
            content,
            model: 'deepseek-chat',
            usage: { promptTokens: null, completionTokens: null, totalTokens: null },
          };
        } catch (err) {
          throw this.classifyDeepseekError(err);
        }
      },
    };

    this.chain = [deepseekAdapter, this.claudeService];
  }

  async generateAssignment(
    prompt: string,
    context?: GenerateAssignmentContext,
  ): Promise<AiGenerationResult> {
    if (context?.schoolId != null) {
      // Throws ForbiddenException if this school is already at its monthly
      // quota. Intentionally BEFORE the provider chain below, and awaited
      // (unlike usage logging further down), so an over-quota school incurs
      // no DeepSeek/Claude call at all.
      await this.aiUsageService.assertWithinMonthlyLimit(context.schoolId);
    }

    let lastError: AiProviderError | null = null;

    for (let i = 0; i < this.chain.length; i++) {
      const provider = this.chain[i];
      const isLastProvider = i === this.chain.length - 1;

      try {
        const result = await provider.generateAssignment(prompt);

        void this.aiUsageService.record({
          schoolId: context?.schoolId,
          userId: context?.userId,
          provider: provider.providerName,
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
                provider.providerName,
                'UNKNOWN',
                (err as Error)?.message ?? 'Unknown AI provider error',
                false,
              );

        lastError = aiError;

        this.logger.warn(
          `${provider.providerName} generation failed (${aiError.reason}): ${aiError.message}`,
        );

        void this.aiUsageService.record({
          schoolId: context?.schoolId,
          userId: context?.userId,
          provider: provider.providerName,
          status: AiUsageStatus.FAILED,
          errorMessage: `${aiError.reason}: ${aiError.message}`,
        });

        if (!isLastProvider && aiError.retryable) {
          continue; // Fall through to the next provider in the chain.
        }

        break;
      }
    }

    throw new ServiceUnavailableException(
      lastError
        ? `AI assignment generation is temporarily unavailable (${lastError.provider}: ${lastError.reason}). Please try again shortly.`
        : 'AI assignment generation is temporarily unavailable. Please try again shortly.',
    );
  }

  /**
   * DeepseekService (untouched — out of scope for this change) throws a
   * plain InternalServerErrorException carrying only a message string, not
   * a typed AiProviderError, and it collapses every non-2xx HTTP response
   * into the same "DeepSeek API failed: <body>" message regardless of
   * status code. Without editing that file we don't have the actual status
   * code, so this classifies by sniffing the message text for the same
   * signals DeepSeek's own error bodies carry — including "Insufficient
   * Balance", the exact text reported in production. This is an
   * approximation: rate-limit (429) and server (5xx) responses are only
   * caught if DeepSeek's error body text says so; anything unrecognized is
   * treated as UNKNOWN/non-retryable rather than guessed at, so a real bug
   * can't get silently masked by a fallback to Claude.
   */
  private classifyDeepseekError(err: unknown): AiProviderError {
    const message = err instanceof Error ? err.message : String(err);
    const lower = message.toLowerCase();

    let reason: AiProviderErrorReason = 'UNKNOWN';

    if (lower.includes('insufficient balance')) {
      reason = 'INSUFFICIENT_BALANCE';
    } else if (lower.includes('rate limit') || lower.includes('429')) {
      reason = 'RATE_LIMITED';
    } else if (
      lower.includes('fetch failed') ||
      lower.includes('econnrefused') ||
      lower.includes('enotfound') ||
      lower.includes('timed out') ||
      lower.includes('timeout') ||
      lower.includes('502') ||
      lower.includes('503') ||
      lower.includes('504') ||
      lower.includes('unavailable')
    ) {
      reason = 'UNAVAILABLE';
    } else if (lower.includes('api key is not configured')) {
      reason = 'NOT_CONFIGURED';
    } else if (lower.includes('returned no content') || lower.includes('was not valid json')) {
      reason = 'INVALID_RESPONSE';
    }

    return new AiProviderError('DEEPSEEK', reason, message);
  }
}
