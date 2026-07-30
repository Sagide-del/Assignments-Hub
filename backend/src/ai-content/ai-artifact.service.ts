import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AiArtifactStatus,
  AiArtifactType,
  AiReviewDecision,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AssignmentsService } from "../assignments/assignments.service";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { Role } from "../common/enums/role.enum";
import { AiArtifactMapperService } from "./ai-artifact-mapper.service";
import { sha256 } from "./ai-content.utils";

const EDITABLE_STATUSES = new Set<AiArtifactStatus>([
  AiArtifactStatus.GENERATED,
  AiArtifactStatus.IN_REVIEW,
  AiArtifactStatus.APPROVED,
  AiArtifactStatus.REJECTED,
]);

@Injectable()
export class AiArtifactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assignments: AssignmentsService,
    private readonly mapper: AiArtifactMapperService,
    private readonly audit: AuditService,
  ) {}

  async findOne(id: number, actor: AuthenticatedUser) {
    const artifact = await this.prisma.aiContentArtifact.findUnique({
      where: { id },
      include: {
        generationJob: {
          select: { id: true, requestedById: true, status: true },
        },
        reviews: {
          include: {
            reviewer: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!artifact) throw new NotFoundException("AI artifact not found");
    this.assertAccess(artifact, actor);
    return artifact;
  }

  async updateContent(
    id: number,
    content: Record<string, unknown>,
    actor: AuthenticatedUser,
  ) {
    const artifact = await this.findOne(id, actor);
    if (!EDITABLE_STATUSES.has(artifact.status)) {
      throw new BadRequestException(
        `A ${artifact.status} artifact cannot be edited`,
      );
    }
    if (artifact.type !== AiArtifactType.ASSIGNMENT_DRAFT) {
      throw new BadRequestException("This artifact type is not editable here");
    }

    const parsed = this.mapper.readAssignmentContent(content);
    this.mapper.toValidationPayload(parsed);
    const contentHash = sha256(parsed);

    const [updated] = await this.prisma.$transaction([
      this.prisma.aiContentArtifact.update({
        where: { id: artifact.id },
        data: {
          content: parsed as unknown as Prisma.InputJsonValue,
          contentHash,
          version: { increment: 1 },
          status: AiArtifactStatus.GENERATED,
          reviewedById: null,
          reviewedAt: null,
        },
      }),
      this.prisma.aiReviewEvent.create({
        data: {
          schoolId: artifact.schoolId,
          artifactId: artifact.id,
          reviewerId: actor.id,
          decision: AiReviewDecision.EDITED,
          contentHash,
          metadata: {
            previousVersion: artifact.version,
            nextVersion: artifact.version + 1,
          },
        },
      }),
    ]);

    void this.recordAudit("ai.artifact.edited", updated, actor);
    return updated;
  }

  async validate(id: number, actor: AuthenticatedUser) {
    const artifact = await this.findOne(id, actor);
    this.assertAssignmentDraft(artifact.type);
    const content = this.mapper.readAssignmentContent(artifact.content);
    const validation = await this.assignments.validateExamJsonRaw(
      this.mapper.toValidationPayload(content),
    );

    if (
      validation.valid &&
      (artifact.status === AiArtifactStatus.GENERATED ||
        artifact.status === AiArtifactStatus.REJECTED)
    ) {
      await this.prisma.aiContentArtifact.update({
        where: { id: artifact.id },
        data: { status: AiArtifactStatus.IN_REVIEW },
      });
      void this.audit.record({
        action: "ai.artifact.validation_passed",
        schoolId: artifact.schoolId,
        userId: actor.id,
        resource: `AiContentArtifact:${artifact.id}`,
        metadata: { version: artifact.version },
      });
    }
    return {
      valid: validation.valid,
      errors: validation.errors,
      computedTotalMarks: validation.computedTotalMarks,
      status: validation.valid ? AiArtifactStatus.IN_REVIEW : artifact.status,
    };
  }

  async approve(
    id: number,
    notes: string | undefined,
    actor: AuthenticatedUser,
  ) {
    const artifact = await this.findOne(id, actor);
    if (artifact.status !== AiArtifactStatus.IN_REVIEW) {
      throw new BadRequestException(
        "Validate the artifact before approving it",
      );
    }

    const content = this.mapper.readAssignmentContent(artifact.content);
    const validation = await this.assignments.validateExamJsonRaw(
      this.mapper.toValidationPayload(content),
    );
    if (!validation.valid) {
      throw new BadRequestException({
        message: "The artifact is no longer valid",
        errors: validation.errors,
      });
    }

    const reviewedAt = new Date();
    const [updated] = await this.prisma.$transaction([
      this.prisma.aiContentArtifact.update({
        where: { id: artifact.id },
        data: {
          status: AiArtifactStatus.APPROVED,
          reviewedById: actor.id,
          reviewedAt,
        },
      }),
      this.prisma.aiReviewEvent.create({
        data: {
          schoolId: artifact.schoolId,
          artifactId: artifact.id,
          reviewerId: actor.id,
          decision: AiReviewDecision.APPROVED,
          notes,
          contentHash: artifact.contentHash,
          metadata: { version: artifact.version },
        },
      }),
    ]);
    void this.recordAudit("ai.artifact.approved", updated, actor);
    return updated;
  }

  async reject(id: number, notes: string, actor: AuthenticatedUser) {
    const artifact = await this.findOne(id, actor);
    if (
      artifact.status === AiArtifactStatus.PUBLISHED ||
      artifact.status === AiArtifactStatus.ARCHIVED
    ) {
      throw new BadRequestException(
        `A ${artifact.status} artifact cannot be rejected`,
      );
    }
    if (!notes.trim())
      throw new BadRequestException("Rejection notes are required");

    const [updated] = await this.prisma.$transaction([
      this.prisma.aiContentArtifact.update({
        where: { id: artifact.id },
        data: {
          status: AiArtifactStatus.REJECTED,
          reviewedById: actor.id,
          reviewedAt: new Date(),
        },
      }),
      this.prisma.aiReviewEvent.create({
        data: {
          schoolId: artifact.schoolId,
          artifactId: artifact.id,
          reviewerId: actor.id,
          decision: AiReviewDecision.REJECTED,
          notes: notes.trim(),
          contentHash: artifact.contentHash,
          metadata: { version: artifact.version },
        },
      }),
    ]);
    void this.recordAudit("ai.artifact.rejected", updated, actor);
    return updated;
  }

  async archive(id: number, actor: AuthenticatedUser) {
    const artifact = await this.findOne(id, actor);
    if (artifact.status === AiArtifactStatus.PUBLISHED) {
      throw new BadRequestException(
        "Published artifacts remain as permanent provenance",
      );
    }
    const updated = await this.prisma.aiContentArtifact.update({
      where: { id: artifact.id },
      data: { status: AiArtifactStatus.ARCHIVED },
    });
    void this.recordAudit("ai.artifact.archived", updated, actor);
    return updated;
  }

  async reviewHistory(id: number, actor: AuthenticatedUser) {
    const artifact = await this.findOne(id, actor);
    return artifact.reviews;
  }

  private assertAssignmentDraft(type: AiArtifactType) {
    if (type !== AiArtifactType.ASSIGNMENT_DRAFT) {
      throw new BadRequestException(
        "Only assignment drafts use this validation flow",
      );
    }
  }

  private assertAccess(
    artifact: {
      schoolId: number;
      generationJob: { requestedById: number };
    },
    actor: AuthenticatedUser,
  ) {
    if (actor.role === Role.STUDENT) {
      throw new NotFoundException("AI artifact not found");
    }
    if (
      actor.role !== Role.PLATFORM_ADMIN &&
      artifact.schoolId !== actor.schoolId
    ) {
      throw new NotFoundException("AI artifact not found");
    }
    if (
      actor.role === Role.TEACHER &&
      artifact.generationJob.requestedById !== actor.id
    ) {
      throw new ForbiddenException("You can only manage your own AI artifacts");
    }
  }

  private recordAudit(
    action: string,
    artifact: {
      id: number;
      schoolId: number;
      version: number;
      status: AiArtifactStatus;
    },
    actor: AuthenticatedUser,
  ) {
    return this.audit.record({
      action,
      schoolId: artifact.schoolId,
      userId: actor.id,
      resource: `AiContentArtifact:${artifact.id}`,
      metadata: { version: artifact.version, status: artifact.status },
    });
  }
}
