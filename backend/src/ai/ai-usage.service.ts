import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { AiProvider, AiUsageStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { resolveAiMonthlyLimit } from '../common/config/ai-limits';

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
 * success or failure. Also enforces the school's monthly AI generation
 * quota (assertWithinMonthlyLimit), resolved from its current subscription
 * tier. Per-provider usage reports, token/cost tracking, and admin
 * analytics are not implemented yet, but AiUsageLog already records the
 * data they'll need.
 *
 * record() mirrors AuditService's "logging must never break the calling
 * request" contract: every failure — a missing schoolId, a DB error — is
 * caught and logged locally, never thrown or rejected in a way the caller
 * must handle. assertWithinMonthlyLimit is the opposite by design: it's
 * meant to block generation, so unlike record() it does throw.
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

  /**
   * Throws ForbiddenException if `schoolId` has already reached its plan's
   * monthly AI Assignment Generator quota. Called by
   * AiProviderRouterService.generateAssignment BEFORE either provider is
   * invoked, so an over-quota school never reaches DeepSeek or Claude.
   *
   * "This month" is the current calendar month in server local time,
   * counting only successful generations — failed attempts (including ones
   * that failed because the quota was already exceeded) don't count against
   * the quota.
   */
  async assertWithinMonthlyLimit(schoolId: number): Promise<void> {
    const limit = await this.resolveMonthlyLimit(schoolId);

    if (limit === null) {
      return; // Enterprise (or otherwise unlimited) — skip the count query entirely.
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usedThisMonth = await this.prisma.aiUsageLog.count({
      where: {
        schoolId,
        status: AiUsageStatus.SUCCESS,
        createdAt: { gte: startOfMonth },
      },
    });

    if (usedThisMonth >= limit) {
      throw new ForbiddenException(
        `This school has reached its monthly AI assignment generation limit (${limit}). The limit resets at the start of next month.`,
      );
    }
  }

  /**
   * Resolves schoolId's monthly AI quota from its current subscription
   * tier. Returns null for unlimited. The tier -> limit mapping itself
   * lives in ../common/config/ai-limits.ts (single source of truth, also
   * used by ReportsService.aiUsageReport) — this just does the Subscription
   * lookup and hands the plan name off to it.
   */
  private async resolveMonthlyLimit(schoolId: number): Promise<number | null> {
    const latestSubscription = await this.prisma.subscription.findFirst({
      where: { schoolId },
      orderBy: { startedAt: 'desc' },
    });

    return resolveAiMonthlyLimit(latestSubscription?.plan);
  }
}
