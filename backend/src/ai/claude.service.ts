import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  AiGenerationResult,
  AiProviderService,
} from './interfaces/ai-provider.interface';

import { AiProviderError } from './errors/ai-provider.error';

@Injectable()
export class ClaudeService implements AiProviderService {
  readonly providerName = 'CLAUDE' as const;

  private readonly apiUrl =
    'https://api.anthropic.com/v1/messages';

  private readonly apiKey: string;

  private readonly model: string;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.apiKey =
      this.configService.get<string>('CLAUDE_API_KEY') || '';

    this.model =
      this.configService.get<string>('CLAUDE_MODEL') ||
      'claude-3-5-sonnet-20240620';
  }

  async generateAssignment(
    prompt: string,
  ): Promise<AiGenerationResult> {

    if (!this.apiKey) {
      throw new AiProviderError(
        'CLAUDE',
        'NOT_CONFIGURED',
        'Claude API key is not configured',
        false,
      );
    }

    let response: Response;

    try {
      response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 3000,
          temperature: 0.3,
          system:
            'You are an educational assessment generator. Return only valid JSON.',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });
    } catch (err) {
      throw new AiProviderError(
        'CLAUDE',
        'UNAVAILABLE',
        `Claude request failed: ${(err as Error).message}`,
      );
    }

    if (!response.ok) {
      const errorText = await response.text();

      throw new AiProviderError(
        'CLAUDE',
        'UNKNOWN',
        `Claude API failed (${response.status}): ${errorText}`,
        false,
      );
    }

    const data = await response.json();

    const content =
      data?.content?.[0]?.text;

    if (!content) {
      throw new AiProviderError(
        'CLAUDE',
        'INVALID_RESPONSE',
        'Claude returned no content',
        false,
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new AiProviderError(
        'CLAUDE',
        'INVALID_RESPONSE',
        'Claude response was not valid JSON',
        false,
      );
    }

    return {
      content: parsed,
      model: this.model,
      usage: {
        promptTokens:
          data?.usage?.input_tokens ?? null,

        completionTokens:
          data?.usage?.output_tokens ?? null,

        totalTokens:
          (data?.usage?.input_tokens ?? 0) +
          (data?.usage?.output_tokens ?? 0),
      },
    };
  }
}