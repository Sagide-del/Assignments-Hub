import {
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { AiFeature, AiJobStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { resolveAiMonthlyLimit } from "../common/config/ai-limits";
import { AiFeatureConfigService } from "./ai-feature-config.service";

interface ReserveJobInput {
  actor: AuthenticatedUser;
  schoolId: number;
  feature: AiFeature;
  idempotencyKey: string;
  inputHash: string;
  promptTemplateVersion: string;
  extractedContentId?: number;
  parameters: Prisma.InputJsonValue;
}

@Injectable()
export class AiQuotaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureConfig: AiFeatureConfigService,
  ) {}

  async reserveJob(input: ReserveJobInput) {
    const config = await this.featureConfig.assertEnabled(
      input.actor,
      input.feature,
      input.schoolId,
    );
    const normalizedKey = input.idempotencyKey?.trim();
    if (!normalizedKey || normalizedKey.length > 200) {
      throw new ConflictException("A valid Idempotency-Key is required");
    }

    const planLimit =
      config.monthlyRequestLimit ??
      (await this.resolvePlanLimit(input.schoolId));
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (transaction) => {
            const existing = await transaction.aiGenerationJob.findUnique({
              where: {
                schoolId_idempotencyKey: {
                  schoolId: input.schoolId,
                  idempotencyKey: normalizedKey,
                },
              },
            });
            if (existing) {
              if (existing.inputHash !== input.inputHash) {
                throw new ConflictException(
                  "This Idempotency-Key was already used with different input",
                );
              }
              return existing;
            }

            if (planLimit !== null) {
              const reserved = await transaction.aiGenerationJob.count({
                where: {
                  schoolId: input.schoolId,
                  feature: input.feature,
                  createdAt: { gte: monthStart },
                  status: {
                    in: [
                      AiJobStatus.QUEUED,
                      AiJobStatus.RUNNING,
                      AiJobStatus.SUCCEEDED,
                    ],
                  },
                },
              });
              if (reserved >= planLimit) {
                throw new ForbiddenException(
                  `This school has reached its monthly AI generation limit (${planLimit})`,
                );
              }
            }

            return transaction.aiGenerationJob.create({
              data: {
                schoolId: input.schoolId,
                requestedById: input.actor.id,
                feature: input.feature,
                status: AiJobStatus.QUEUED,
                extractedContentId: input.extractedContentId,
                idempotencyKey: normalizedKey,
                inputHash: input.inputHash,
                promptTemplateVersion: input.promptTemplateVersion,
                parameters: input.parameters,
              },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (
          error instanceof ConflictException ||
          error instanceof ForbiddenException
        ) {
          throw error;
        }
        if (this.isUniqueConstraintError(error)) {
          const existing = await this.prisma.aiGenerationJob.findUnique({
            where: {
              schoolId_idempotencyKey: {
                schoolId: input.schoolId,
                idempotencyKey: normalizedKey,
              },
            },
          });
          if (existing?.inputHash === input.inputHash) {
            return existing;
          }
          if (existing) {
            throw new ConflictException(
              "This Idempotency-Key was already used with different input",
            );
          }
        }
        if (this.isRetryableTransactionError(error) && attempt < 2) {
          continue;
        }
        throw error;
      }
    }

    throw new ServiceUnavailableException("Could not reserve AI capacity");
  }

  private async resolvePlanLimit(schoolId: number): Promise<number | null> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { schoolId },
      orderBy: { startedAt: "desc" },
      select: { plan: true },
    });
    return resolveAiMonthlyLimit(subscription?.plan);
  }

  private isRetryableTransactionError(error: unknown) {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2034"
    );
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    );
  }
}
