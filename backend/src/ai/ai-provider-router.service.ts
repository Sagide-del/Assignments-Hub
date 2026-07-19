import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

import { DeepseekService } from './deepseek.service';
import { AiProviderError } from './errors/ai-provider.error';
import { AiGenerationResult, AiProviderService } from './interfaces/ai-provider.interface';

/**
 * AI Provider Router.
 *
 *   Teacher Dashboard -> AI Assignment Service (AiService) -> AI Provider
 *   Router (this class) -> DeepSeek (primary) / Claude (fallback, added
 *   in a later change)
 *
 * Stage 1 of the provider-router rollout: DeepSeek is the only provider in
 * the chain. The fallback/retry loop below is already shaped for multiple
 * providers so that adding Claude next is a one-line change to `chain`,
 * with no changes needed to AiService or the controller.
 *
 * Nothing outside this module — no controller — should call
 * DeepseekService directly; always go through this router.
 */
@Injectable()
export class AiProviderRouterService {
  private readonly logger = new Logger(AiProviderRouterService.name);

  private readonly chain: AiProviderService[];

  constructor(private readonly deepseekService: DeepseekService) {
    this.chain = [this.deepseekService];
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
}
