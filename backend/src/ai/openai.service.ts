import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import { AiProviderError } from './errors/ai-provider.error';
import { AiGenerationResult, AiProviderService } from './interfaces/ai-provider.interface';

/**
 * Sole AI assignment-generation provider (see AiProviderRouterService, which
 * is the only thing that should call this directly). Talks to OpenAI's
 * Chat Completions API via the official `openai` SDK and asks for a JSON
 * object response, mirroring the contract DeepseekService/ClaudeService
 * used before this provider swap.
 */
@Injectable()
export class OpenaiService implements AiProviderService {
  readonly providerName = 'OPENAI' as const;

  private readonly logger = new Logger(OpenaiService.name);
  private readonly client: OpenAI | null;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY')?.trim() || '';
    this.model = this.configService.get<string>('OPENAI_MODEL')?.trim() || 'gpt-4';
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
  }

  async generateAssignment(prompt: string): Promise<AiGenerationResult> {
    if (!this.client) {
      throw new AiProviderError(
        'OPENAI',
        'NOT_CONFIGURED',
        'OpenAI API key is not configured',
        false,
      );
    }

    let completion: OpenAI.Chat.Completions.ChatCompletion;

    try {
      completion = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0.7,
        response_format: { type: 'json_object' },
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
      });
    } catch (err) {
      throw this.classifyError(err);
    }

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new AiProviderError(
        'OPENAI',
        'INVALID_RESPONSE',
        'OpenAI returned no content',
        false,
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new AiProviderError(
        'OPENAI',
        'INVALID_RESPONSE',
        'OpenAI response was not valid JSON',
        false,
      );
    }

    return {
      content: parsed,
      model: completion.model || this.model,
      usage: {
        promptTokens: completion.usage?.prompt_tokens ?? null,
        completionTokens: completion.usage?.completion_tokens ?? null,
        totalTokens: completion.usage?.total_tokens ?? null,
      },
    };
  }

  /**
   * The `openai` SDK throws typed `APIError` subclasses carrying an HTTP
   * `status`. Classify by status so AiProviderRouterService's retry/failure
   * handling has an accurate signal instead of text-sniffing an error
   * message (the DeepSeek integration this replaces had to text-sniff
   * because DeepseekService didn't expose a status code — OpenAI's SDK
   * does, so we use it directly).
   */
  private classifyError(err: unknown): AiProviderError {
    const status = (err as { status?: number } | undefined)?.status;
    const message = err instanceof Error ? err.message : String(err);
    this.logger.warn(`OpenAI request failed (status ${status ?? 'unknown'}): ${message}`);

    if (status === 401 || status === 403) {
      return new AiProviderError('OPENAI', 'NOT_CONFIGURED', message, false);
    }
    if (status === 429) {
      return new AiProviderError('OPENAI', 'RATE_LIMITED', message);
    }
    if (status !== undefined && status >= 500) {
      return new AiProviderError('OPENAI', 'UNAVAILABLE', message);
    }
    if (status === undefined) {
      // No status at all means the request never reached OpenAI (network
      // failure, DNS, timeout) rather than an API-level rejection.
      return new AiProviderError('OPENAI', 'UNAVAILABLE', message);
    }
    return new AiProviderError('OPENAI', 'UNKNOWN', message, false);
  }
}
