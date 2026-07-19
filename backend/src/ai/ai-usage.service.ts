import { Injectable, Logger } from '@nestjs/common';
import { AiProvider, AiUsageStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export interface RecordAiUsageEntry {
  // AiUsageLog.schoolId is required in the schema. This is nullable/optional
  // here (not just on the Prisma model) because not every current caller of
  // AiProviderRouterService.generateAssignment supplies a schoolId yet — see
  // the GenerateAssignmentContext note in ai-provider-router.service.ts.
  // When it's missing, record() skips the write rather than attempting an
  // insert Prisma would reject anyway.
  schoolId?: number | null;
  userId?: number | null;
  provider: AiProvider;
  status: AiUsageStatus;
  model?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  errorMessage?: string | null;
}

/**
 * Records AI Assignment Generator usage (see backend/src/ai,
 * AiProviderRouterService) to AiUsageLog — one row per provider attempt,
 * success or failure. Foundation for a future school-level AI generation
 * limit, per-provider usage reports, token/cost tracking, and admin
 * analytics; none of those are implemented yet, this service only records
 * the data they'll need.
 *
 * Mirrors AuditService's "logging must never break the calling request"
 * contract: every failure — a missing schoolId, a DB error — is caught and
 * logged locally, never thrown or rejected in a way the caller must handle.
 */
@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: RecordAiUsageEntry): Promise<void> {
    if (entry.schoolId == null) {
      // Not an error today — most call sites don't pass school context yet.
      // See the scope note in ai-provider-router.service.ts.
      this.logger.warn(
        `Skipping AI usage log for ${entry.provider} (${entry.status}): no schoolId in the call context`,
      );
      return;
    }

    try {
      await this.prisma.aiUsageLog.create({
        data: {
          schoolId: entry.schoolId,
          userId: entry.userId ?? null,
          provider: entry.provider,
          status: entry.status,
          model: entry.model ?? null,
          promptTokens: entry.promptTokens ?? null,
          completionTokens: entry.completionTokens ?? null,
          totalTokens: entry.totalTokens ?? null,
          errorMessage: entry.errorMessage ?? null,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to write AI usage log for ${entry.provider} (${entry.status})`,
        err as Error,
      );
    }
  }
}
