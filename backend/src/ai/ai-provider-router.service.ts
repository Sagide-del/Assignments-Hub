import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { AiProviderError } from './errors/ai-provider.error';
import { AiGenerationResult } from './interfaces/ai-provider.interface';

@Injectable()
export class OpenaiService {
  private readonly client: OpenAI;
  private readonly logger = new Logger(OpenaiService.name);
  public readonly providerName = 'OPENAI';

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

      if (!response.choices || response.choices.length === 0) {
        throw new AiProviderError(
          'OPENAI',
          'EMPTY_RESPONSE',
          'No choices returned from DeepSeek API',
          true,
        );
      }

      const content = response.choices[0]?.message?.content || '';

      try {
        JSON.parse(content);
      } catch {
        throw new AiProviderError(
          'OPENAI',
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
      };
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw error;
      }

      const status = (error as any)?.status;
      const message = (error as Error)?.message || 'Unknown error';

      if (status === 401) {
        throw new AiProviderError(
          'OPENAI',
          'AUTH_ERROR',
          'DeepSeek API key is invalid or missing',
          false,
        );
      }

      if (status === 429) {
        throw new AiProviderError(
          'OPENAI',
          'RATE_LIMITED',
          'DeepSeek rate limit exceeded. Please try again later.',
          true,
        );
      }

      if (status === 503 || status === 504) {
        throw new AiProviderError(
          'OPENAI',
          'PROVIDER_UNAVAILABLE',
          'DeepSeek service is temporarily unavailable. Please try again later.',
          true,
        );
      }

      throw new AiProviderError(
        'OPENAI',
        'PROVIDER_ERROR',
        message,
        false,
      );
    }
  }
}