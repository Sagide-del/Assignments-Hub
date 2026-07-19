import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DeepseekService {
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.deepseek.com/chat/completions';

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('DEEPSEEK_API_KEY') || '';
  }

  async generateAssignment(prompt: string): Promise<any> {
    if (!this.apiKey) {
      throw new InternalServerErrorException(
        'DeepSeek API key is not configured',
      );
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
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

    if (!response.ok) {
      const errorText = await response.text();

      throw new InternalServerErrorException(
        `DeepSeek API failed: ${errorText}`,
      );
    }

    const data = await response.json();

    const content =
      data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new InternalServerErrorException(
        'DeepSeek returned no content',
      );
    }

    try {
      return JSON.parse(content);
    } catch {
      throw new InternalServerErrorException(
        'DeepSeek response was not valid JSON',
      );
    }
  }
}