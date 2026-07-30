/**
 * Shared contract implemented by every AI assignment-generation provider.
 * OpenAI is the only active implementation (see OpenaiService) —
 * AiProviderRouterService depends only on this interface, never on a
 * concrete provider, so adding/swapping a provider means implementing this
 * interface and registering it; nothing else has to change.
 */
export interface AiGenerationUsage {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
}

export interface AiGenerationResult {
  /** Parsed assignment JSON returned by the model. */
  content: unknown;
  model: string;
  usage: AiGenerationUsage;
}

export type AiProviderName = 'OPENAI';

export interface AiProviderService {
  /** Used for log messages and (later) usage-tracking rows. */
  readonly providerName: AiProviderName;

  generateAssignment(prompt: string): Promise<AiGenerationResult>;
}
