import { AiProviderName } from "../interfaces/ai-provider.interface";

export type AiProviderErrorReason =
  | "INSUFFICIENT_BALANCE"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "INVALID_REQUEST"
  | "INVALID_RESPONSE"
  | "NOT_CONFIGURED"
  | "UNKNOWN";

const DEFAULT_RETRYABLE_REASONS: AiProviderErrorReason[] = [
  "RATE_LIMITED",
  "UNAVAILABLE",
];

/** Classified provider failure. Only rate limits and service/network outages
 * are transient; balance and configuration problems need administrator action.
 */
export class AiProviderError extends Error {
  constructor(
    public readonly provider: AiProviderName,
    public readonly reason: AiProviderErrorReason,
    message: string,
    public readonly retryable: boolean = DEFAULT_RETRYABLE_REASONS.includes(
      reason,
    ),
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}
