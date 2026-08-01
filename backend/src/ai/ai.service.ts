import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { AiProviderError } from './errors/ai-provider.error';
import { AiGenerationResult } from './interfaces/ai-provider.interface';

@Injectable()
export class OpenaiService {
  private readonly client: OpenAI;
  private readonly logger = new Logger(OpenaiService.name);
  public readonly providerName = 'DEEPSEEK';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    const baseURL = 'https://api.deepseek.com';

    if (!apiKey) {
      this.logger.warn('DEEPSEEK_API_KEY is not set. AI features will not work.');
    }

    this.client = new OpenAI({
      apiKey: apiKey || 'missing-api-key',
      baseURL: baseURL,
    });
  }

  async generateAssignment(prompt: string): Promise<AiGenerationResult> {
    try {
      const startTime = Date.now();

      const response = await this.client.chat.completions.create({
        model: 'deepseek-v4-pro',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational content creator specializing in school assessments.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      const duration = Date.now() - startTime;

      if (!response.choices || response.choices.length === 0) {
        throw new AiProviderError(
          'DEEPSEEK',
          'EMPTY_RESPONSE',
          'No choices returned from DeepSeek API',
          true,
        );
      }

      const content = response.choices[0]?.message?.content || '';

      // Attempt to parse JSON to validate
      try {
        JSON.parse(content);
      } catch {
        throw new AiProviderError(
          'DEEPSEEK',
          'INVALID_JSON',
          'DeepSeek returned invalid JSON',
          true,
        );
      }

      return {
        content,
        model: response.model || 'deepseek-v4-pro',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        duration,
      };
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw error;
      }

      // Handle OpenAI SDK errors
      const status = (error as any)?.status;
      const message = (error as Error)?.message || 'Unknown error';

      if (status === 401) {
        throw new AiProviderError(
          'DEEPSEEK',
          'AUTH_ERROR',
          'DeepSeek API key is invalid or missing',
          false,
        );
      }

      if (status === 429) {
        throw new AiProviderError(
          'DEEPSEEK',
          'RATE_LIMITED',
          'DeepSeek rate limit exceeded. Please try again later.',
          true,
        );
      }

      if (status === 503 || status === 504) {
        throw new AiProviderError(
          'DEEPSEEK',
          'PROVIDER_UNAVAILABLE',
          'DeepSeek service is temporarily unavailable. Please try again later.',
          true,
        );
      }

      throw new AiProviderError(
        'DEEPSEEK',
        'PROVIDER_ERROR',
        message,
        false,
      );
    }
  }
}