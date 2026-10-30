import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { AiUsageStatus } from "@prisma/client";

import { AiUsageService } from "./ai-usage.service";
import { OpenaiService } from "./openai.service";
import {
  AiProviderError,
  AiProviderErrorReason,
} from "./errors/ai-provider.error";
import { AiGenerationResult } from "./interfaces/ai-provider.interface";

/**
 * Optional caller context, used only for AI usage logging (AiUsageService).
 * Both fields are optional because not every current call site supplies
 * them yet — AiService's existing call, generateAssignment(prompt) with no
 * second argument, still works unchanged. When schoolId is missing,
 * AiUsageService.record skips persisting that attempt (AiUsageLog.schoolId
 * is required in the schema) instead of writing an invalid row.
 */
export interface GenerateAssignmentContext {
  schoolId?: number | null;
  userId?: number | null;
}

/**
 * AI Provider Router.
 *
 *   Teacher/Platform-Admin flow -> AiService / QuestionBankService -> AI
 *   Provider Router (this class) -> DeepSeek.
 *
 * DeepSeek is the sole provider. The OpenAI SDK is used with a custom
 * baseURL pointing to DeepSeek's API endpoint.
 *
 * Every attempt (success or failure) is still recorded to AiUsageLog via
 * AiUsageService — logging is fire-and-forget (not awaited), so a slow or
 * failing usage write can never add latency to, or break, the actual
 * generation response.
 *
 * Before the provider is called, generateAssignment checks the school's
 * monthly AI usage quota (AiUsageService.assertWithinMonthlyLimit). Unlike
 * usage logging, this check IS awaited and DOES throw (ForbiddenException)
 * — an over-quota school must never reach DeepSeek. The check only runs when
 * context.schoolId is supplied.
 */
@Injectable()
export class AiProviderRouterService {
  private readonly logger = new Logger(AiProviderRouterService.name);

  constructor(
    private readonly openaiService: OpenaiService,
    private readonly aiUsageService: AiUsageService,
  ) {}

  async generateAssignment(
    prompt: string,
    context?: GenerateAssignmentContext,
  ): Promise<AiGenerationResult> {
    if (context?.schoolId != null) {
      // Throws ForbiddenException if this school is already at its monthly
      // quota. Intentionally BEFORE the provider call below, and awaited
      // (unlike usage logging further down), so an over-quota school incurs
      // no AI call at all.
      await this.aiUsageService.assertWithinMonthlyLimit(context.schoolId);
    }

    try {
      const result = await this.openaiService.generateAssignment(prompt);

      void this.aiUsageService.record({
        schoolId: context?.schoolId,
        userId: context?.userId,
        provider: this.openaiService.providerName,
        status: AiUsageStatus.SUCCESS,
        model: result.model,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens,
      });

      return result;
    } catch (err) {
      const aiError =
        err instanceof AiProviderError
          ? err
          : new AiProviderError(
              "OPENAI",
              "UNKNOWN",
              (err as Error)?.message || "Unknown AI provider error",
              false,
            );

      this.logger.warn(
        `DeepSeek generation failed (${aiError.reason}): ${aiError.message}`,
      );

      void this.aiUsageService.record({
        schoolId: context?.schoolId,
        userId: context?.userId,
        provider: this.openaiService.providerName,
        status: AiUsageStatus.FAILED,
        errorMessage: `${aiError.reason}: ${aiError.message}`,
      });

      const guidance: Record<AiProviderErrorReason, string> = {
        INSUFFICIENT_BALANCE:
          "DeepSeek reported insufficient account credit. The platform administrator must top up the DeepSeek account before retrying this saved job.",
        NOT_CONFIGURED:
          "DeepSeek is not configured or rejected the API credentials. The platform administrator must check DEEPSEEK_API_KEY before retrying.",
        INVALID_REQUEST:
          "DeepSeek rejected the generation request. The platform administrator must check DEEPSEEK_MODEL and request settings. Retrying unchanged jobs will not resolve this.",
        RATE_LIMITED:
          "DeepSeek rate-limited this request after automatic retries. Wait before retrying the saved job.",
        UNAVAILABLE:
          "DeepSeek could not be reached or timed out after automatic retries. Retry the saved job later.",
        INVALID_RESPONSE:
          "DeepSeek returned an empty or invalid JSON response. Retry this saved job; repeated failures require checking the model and response settings.",
        UNKNOWN:
          "DeepSeek generation failed for an unclassified reason. The platform administrator must inspect the backend provider error log before retrying multiple jobs.",
      };
      throw new ServiceUnavailableException(
        `AI generation failed (${aiError.reason}). ${guidance[aiError.reason]}`,
      );
    }
  }
}
