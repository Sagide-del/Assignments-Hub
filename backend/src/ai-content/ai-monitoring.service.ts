import { ForbiddenException, Injectable } from "@nestjs/common";
import { AiJobStatus, AiUsageStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { Role } from "../common/enums/role.enum";

@Injectable()
export class AiMonitoringService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(actor: AuthenticatedUser) {
    if (actor.role !== Role.PLATFORM_ADMIN) {
      throw new ForbiddenException(
        "Only platform admins can view AI monitoring",
      );
    }

    const periodStart = new Date();
    periodStart.setUTCDate(periodStart.getUTCDate() - 30);

    const [
      jobs,
      extractionCounts,
      artifactCounts,
      usage,
      recentJobs,
      activeSchools,
    ] = await Promise.all([
      this.prisma.aiGenerationJob.findMany({
        where: { createdAt: { gte: periodStart } },
        select: {
          status: true,
          startedAt: true,
          completedAt: true,
          totalTokens: true,
          schoolId: true,
        },
      }),
      this.prisma.aiExtractedContent.groupBy({
        by: ["status"],
        where: { createdAt: { gte: periodStart } },
        _count: { _all: true },
      }),
      this.prisma.aiContentArtifact.groupBy({
        by: ["status"],
        where: { createdAt: { gte: periodStart } },
        _count: { _all: true },
      }),
      this.prisma.aiUsageLog.aggregate({
        where: {
          createdAt: { gte: periodStart },
          status: AiUsageStatus.SUCCESS,
        },
        _count: { _all: true },
        _sum: {
          promptTokens: true,
          completionTokens: true,
          totalTokens: true,
        },
      }),
      this.prisma.aiGenerationJob.findMany({
        where: { createdAt: { gte: periodStart } },
        select: {
          id: true,
          status: true,
          model: true,
          totalTokens: true,
          errorMessage: true,
          createdAt: true,
          completedAt: true,
          school: { select: { id: true, name: true, code: true } },
          requestedBy: { select: { id: true, name: true, role: true } },
          artifacts: {
            select: { id: true, status: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      this.prisma.aiGenerationJob.groupBy({
        by: ["schoolId"],
        where: { createdAt: { gte: periodStart } },
        _count: { _all: true },
        orderBy: { _count: { schoolId: "desc" } },
        take: 10,
      }),
    ]);

    const byStatus = Object.values(AiJobStatus).reduce<Record<string, number>>(
      (summary, status) => {
        summary[status] = jobs.filter((job) => job.status === status).length;
        return summary;
      },
      {},
    );
    const completedDurations = jobs
      .filter((job) => job.startedAt && job.completedAt)
      .map((job) => job.completedAt!.getTime() - job.startedAt!.getTime());
    const averageGenerationSeconds = completedDurations.length
      ? Math.round(
          completedDurations.reduce((sum, value) => sum + value, 0) /
            completedDurations.length /
            100,
        ) / 10
      : null;
    const failed = byStatus[AiJobStatus.FAILED] ?? 0;
    const finished = failed + (byStatus[AiJobStatus.SUCCEEDED] ?? 0);

    const schoolIds = activeSchools.map((item) => item.schoolId);
    const schools = schoolIds.length
      ? await this.prisma.school.findMany({
          where: { id: { in: schoolIds } },
          select: { id: true, name: true, code: true },
        })
      : [];
    const schoolById = new Map(schools.map((school) => [school.id, school]));

    return {
      period: {
        from: periodStart.toISOString(),
        to: new Date().toISOString(),
      },
      jobs: {
        total: jobs.length,
        byStatus,
        failureRatePercent:
          finished > 0 ? Math.round((failed / finished) * 1_000) / 10 : 0,
        averageGenerationSeconds,
      },
      extractions: Object.fromEntries(
        extractionCounts.map((item) => [item.status, item._count._all]),
      ),
      artifacts: Object.fromEntries(
        artifactCounts.map((item) => [item.status, item._count._all]),
      ),
      usage: {
        successfulProviderCalls: usage._count._all,
        promptTokens: usage._sum.promptTokens ?? 0,
        completionTokens: usage._sum.completionTokens ?? 0,
        totalTokens: usage._sum.totalTokens ?? 0,
      },
      topSchools: activeSchools.map((item) => ({
        school: schoolById.get(item.schoolId) ?? {
          id: item.schoolId,
          name: "Unknown school",
          code: "",
        },
        jobs: item._count._all,
      })),
      recentJobs,
    };
  }
}
