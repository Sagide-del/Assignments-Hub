import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AiFeature, Prisma, SubscriptionStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { Role } from "../common/enums/role.enum";
import { UpsertAiFeatureConfigDto } from "./dto/upsert-ai-feature-config.dto";
import { AI_FEATURE_ENV_FLAGS } from "./ai-content.constants";
import { envEnabled } from "./ai-content.utils";

const AI_ROLES = new Set<Role>([
  Role.TEACHER,
  Role.SCHOOL_ADMIN,
  Role.PLATFORM_ADMIN,
]);
const AI_SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>([
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIAL,
]);

@Injectable()
export class AiFeatureConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async assertEnabled(
    actor: AuthenticatedUser,
    feature: AiFeature,
    targetSchoolId = actor.schoolId,
    options: { requirePublish?: boolean } = {},
  ) {
    if (!AI_ROLES.has(actor.role)) {
      throw new ForbiddenException(
        "This AI feature is not available to your role",
      );
    }
    if (
      actor.role !== Role.PLATFORM_ADMIN &&
      actor.schoolId !== targetSchoolId
    ) {
      throw new ForbiddenException(
        "You cannot access another school's AI content",
      );
    }
    if (!envEnabled(this.config.get<string>("AI_FEATURES_ENABLED"))) {
      throw new ForbiddenException("AI features are currently disabled");
    }

    const featureFlag = AI_FEATURE_ENV_FLAGS[feature];
    if (!envEnabled(this.config.get<string>(featureFlag))) {
      throw new ForbiddenException(
        `${feature.replaceAll("_", " ")} is currently disabled`,
      );
    }

    const [school, featureConfig] = await Promise.all([
      this.prisma.school.findUnique({
        where: { id: targetSchoolId },
        select: { id: true, subscriptionStatus: true },
      }),
      this.prisma.aiFeatureConfig.findUnique({
        where: {
          schoolId_feature: {
            schoolId: targetSchoolId,
            feature,
          },
        },
      }),
    ]);

    if (!school) throw new NotFoundException("School not found");
    if (!AI_SUBSCRIPTION_STATUSES.has(school.subscriptionStatus)) {
      throw new ForbiddenException("An active school subscription is required");
    }
    if (!featureConfig?.enabled) {
      throw new ForbiddenException(
        "This AI feature is not enabled for the school",
      );
    }
    if (options.requirePublish && featureConfig.previewOnly) {
      throw new ForbiddenException(
        "This school can preview AI content but cannot publish it yet",
      );
    }

    return featureConfig;
  }

  async getCapabilities(
    actor: AuthenticatedUser,
    targetSchoolId = actor.schoolId,
  ) {
    if (
      actor.role !== Role.PLATFORM_ADMIN &&
      actor.schoolId !== targetSchoolId
    ) {
      throw new ForbiddenException(
        "You cannot access another school's AI configuration",
      );
    }

    const configs = await this.prisma.aiFeatureConfig.findMany({
      where: { schoolId: targetSchoolId },
      orderBy: { feature: "asc" },
    });

    return Object.values(AiFeature).map((feature) => {
      const schoolConfig = configs.find((entry) => entry.feature === feature);
      const globallyEnabled =
        envEnabled(this.config.get<string>("AI_FEATURES_ENABLED")) &&
        envEnabled(this.config.get<string>(AI_FEATURE_ENV_FLAGS[feature]));
      return {
        feature,
        enabled: Boolean(globallyEnabled && schoolConfig?.enabled),
        previewOnly: schoolConfig?.previewOnly ?? true,
        monthlyRequestLimit: schoolConfig?.monthlyRequestLimit ?? null,
      };
    });
  }

  async upsert(
    schoolId: number,
    feature: AiFeature,
    dto: UpsertAiFeatureConfigDto,
    actor: AuthenticatedUser,
  ) {
    if (actor.role !== Role.PLATFORM_ADMIN) {
      throw new ForbiddenException(
        "Only platform admins can configure AI features",
      );
    }
    if (dto.monthlyRequestLimit !== undefined && dto.monthlyRequestLimit < 1) {
      throw new BadRequestException("monthlyRequestLimit must be at least 1");
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true },
    });
    if (!school) throw new NotFoundException("School not found");

    const saved = await this.prisma.aiFeatureConfig.upsert({
      where: { schoolId_feature: { schoolId, feature } },
      create: {
        schoolId,
        feature,
        enabled: dto.enabled,
        previewOnly: dto.previewOnly ?? true,
        monthlyRequestLimit: dto.monthlyRequestLimit,
        configuration: dto.configuration as Prisma.InputJsonValue | undefined,
        updatedById: actor.id,
      },
      update: {
        enabled: dto.enabled,
        previewOnly: dto.previewOnly,
        monthlyRequestLimit: dto.monthlyRequestLimit,
        configuration: dto.configuration as Prisma.InputJsonValue | undefined,
        updatedById: actor.id,
      },
    });

    void this.audit.record({
      action: "ai.feature_config.updated",
      schoolId,
      userId: actor.id,
      resource: `AiFeatureConfig:${saved.id}`,
      metadata: {
        feature,
        enabled: saved.enabled,
        previewOnly: saved.previewOnly,
        monthlyRequestLimit: saved.monthlyRequestLimit,
      },
    });
    return saved;
  }
}
