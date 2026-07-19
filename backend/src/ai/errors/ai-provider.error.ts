import { AiProviderName } from '../interfaces/ai-provider.interface';

export type AiProviderErrorReason =
  | 'INSUFFICIENT_BALANCE'
  | 'RATE_LIMITED'
  | 'UNAVAILABLE'
  | 'INVALID_RESPONSE'
  | 'NOT_CONFIGURED'
  | 'UNKNOWN';

const DEFAULT_RETRYABLE_REASONS: AiProviderErrorReason[] = [
  'INSUFFICIENT_BALANCE',
  'RATE_LIMITED',
  'UNAVAILABLE',
];

/**
 * Thrown by an AiProviderService implementation instead of a generic Error,
 * so AiProviderRouterService can decide whether to fall back to the next
 * provider in the chain (retryable) or give up and surface the failure
 * (not retryable).
 *
 * Per the AI Provider Router spec, only three conditions are retryable:
 * balance exhausted, rate limit reached, or the API being unavailable.
 * Anything else (bad API key, malformed response, ...) is a real bug/config
 * issue and should surface immediately rather than being masked by a
 * silent fallback.
 */
export class AiProviderError extends Error {
  constructor(
    public readonly provider: AiProviderName,
    public readonly reason: AiProviderErrorReason,
    message: string,
    public readonly retryable: boolean = DEFAULT_RETRYABLE_REASONS.includes(reason),
  ) {
    super(message);
    this.name = 'AiProviderError';
  }
}
