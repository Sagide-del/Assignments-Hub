import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

import { ClaudeService } from './claude.service';
import { DeepseekService } from './deepseek.service';
import { AiProviderError, AiProviderErrorReason } from './errors/ai-provider.error';
import { AiGenerationResult, AiProviderService } from './interfaces/ai-provider.interface';

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

  async generateAssignment(prompt: string): Promise<AiGenerationResult> {
    let lastError: AiProviderError | null = null;

    for (let i = 0; i < this.chain.length; i++) {
      const provider = this.chain[i];
      const isLastProvider = i === this.chain.length - 1;

      try {
        return await provider.generateAssignment(prompt);
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
