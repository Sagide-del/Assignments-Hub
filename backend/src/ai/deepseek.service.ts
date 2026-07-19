import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AiProviderError } from './errors/ai-provider.error';
import { AiGenerationResult, AiProviderService } from './interfaces/ai-provider.interface';

/**
 * Primary, low-cost AI provider (see AiProviderRouterService, which is the
 * only thing that should call this directly). Talks to DeepSeek's
 * OpenAI-compatible chat completions endpoint via fetch — unchanged from
 * before except it now implements AiProviderService and throws
 * AiProviderError (typed, classified) instead of a generic
 * InternalServerErrorException, so the router can decide whether a failure
 * is worth falling back on.
 */
@Injectable()
export class DeepseekService implements AiProviderService {
  readonly providerName = 'DEEPSEEK' as const;

  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.deepseek.com/chat/completions';
  private readonly model = 'deepseek-chat';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DEEPSEEK_API_KEY') || '';
  }

  async generateAssignment(prompt: string): Promise<AiGenerationResult> {
    if (!this.apiKey) {
      throw new AiProviderError(
        'DEEPSEEK',
        'NOT_CONFIGURED',
        'DeepSeek API key is not configured',
        false,
      );
    }

    let response: Response;

    try {
      response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                'You are an educational assessment generator. Return only valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
        }),
      });
    } catch (err) {
      // Network failure / DNS / timeout — the provider itself is unreachable.
      throw new AiProviderError(
        'DEEPSEEK',
        'UNAVAILABLE',
        `DeepSeek request failed: ${(err as Error).message}`,
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw this.classifyHttpError(response.status, errorText);
    }

    const data = await response.json();

    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new AiProviderError(
        'DEEPSEEK',
        'INVALID_RESPONSE',
        'DeepSeek returned no content',
        false,
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new AiProviderError(
        'DEEPSEEK',
        'INVALID_RESPONSE',
        'DeepSeek response was not valid JSON',
        false,
      );
    }

    return {
      content: parsed,
      model: this.model,
      usage: {
        promptTokens: data?.usage?.prompt_tokens ?? null,
        completionTokens: data?.usage?.completion_tokens ?? null,
        totalTokens: data?.usage?.total_tokens ?? null,
      },
    };
  }

  /**
   * DeepSeek doesn't document a single stable error body shape, so this
   * matches on HTTP status first (402/429/5xx) and falls back to sniffing
   * the response text for the "Insufficient Balance" message reported in
   * production, in case it's ever returned with a different status code.
   */
  private classifyHttpError(status: number, errorText: string): AiProviderError {
    const lower = errorText.toLowerCase();

    if (status === 402 || lower.includes('insufficient balance')) {
      return new AiProviderError(
        'DEEPSEEK',
        'INSUFFICIENT_BALANCE',
        `DeepSeek balance exhausted: ${errorText}`,
      );
    }

    if (status === 429) {
      return new AiProviderError(
        'DEEPSEEK',
        'RATE_LIMITED',
        `DeepSeek rate limit reached: ${errorText}`,
      );
    }

    if (status >= 500) {
      return new AiProviderError(
        'DEEPSEEK',
        'UNAVAILABLE',
        `DeepSeek API unavailable (${status}): ${errorText}`,
      );
    }

    // Anything else (bad request, bad key, ...) is a real bug/config issue,
    // not something a fallback would fix — not retryable.
    return new AiProviderError(
      'DEEPSEEK',
      'UNKNOWN',
      `DeepSeek API failed (${status}): ${errorText}`,
      false,
    );
  }
}
