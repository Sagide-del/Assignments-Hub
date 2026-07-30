import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import {
  AiArtifactStatus,
  AiContentArtifact,
  AiFeature,
  AiReviewDecision,
} from "@prisma/client";
import { AssignmentsService } from "../assignments/assignments.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { AiArtifactMapperService } from "./ai-artifact-mapper.service";
import { AiArtifactService } from "./ai-artifact.service";
import { AiFeatureConfigService } from "./ai-feature-config.service";

type AssignmentView = Awaited<ReturnType<AssignmentsService["findOne"]>>;
type ArtifactView =
  Awaited<ReturnType<AiArtifactService["findOne"]>> | AiContentArtifact;

interface AiPublishResult {
  assignmentId: number;
  assignment: AssignmentView;
  artifact: ArtifactView;
}

@Injectable()
export class AiPublishService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly artifacts: AiArtifactService,
    private readonly mapper: AiArtifactMapperService,
    private readonly assignments: AssignmentsService,
    private readonly featureConfig: AiFeatureConfigService,
    private readonly audit: AuditService,
  ) {}

  async publish(
    artifactId: number,
    publishNow: boolean,
    actor: AuthenticatedUser,
  ): Promise<AiPublishResult> {
    let artifact = await this.artifacts.findOne(artifactId, actor);
    if (artifact.status === AiArtifactStatus.PUBLISHED) {
      if (!artifact.publishedAssignmentId) {
        throw new ConflictException(
          "Published artifact has no linked assignment",
        );
      }
      const assignment = await this.assignments.findOne(
        artifact.publishedAssignmentId,
        actor,
      );
      return { assignmentId: assignment.id, assignment, artifact };
    }
    if (artifact.status !== AiArtifactStatus.APPROVED) {
      throw new BadRequestException(
        "Only approved AI artifacts can be published",
      );
    }
    if (artifact.schoolId !== actor.schoolId) {
      // AssignmentsService.create intentionally derives schoolId from the
      // authenticated actor. Do not impersonate another tenant to work
      // around that contract.
      throw new ForbiddenException(
        "Publish with a staff account belonging to the artifact school",
      );
    }

    await this.featureConfig.assertEnabled(
      actor,
      AiFeature.ASSIGNMENT_DRAFT,
      artifact.schoolId,
      { requirePublish: true },
    );

    const content = this.mapper.readAssignmentContent(artifact.content);
    const validation = await this.assignments.validateExamJsonRaw(
      this.mapper.toValidationPayload(content),
    );
    if (!validation.valid) {
      throw new BadRequestException({
        message: "The approved artifact failed final validation",
        errors: validation.errors,
      });
    }

    let assignmentId = artifact.publishedAssignmentId;
    let linked = Boolean(assignmentId);

    if (!assignmentId) {
      const claimed = await this.prisma.aiContentArtifact.updateMany({
        where: {
          id: artifact.id,
          status: AiArtifactStatus.APPROVED,
          publishedAssignmentId: null,
          version: artifact.version,
        },
        data: { version: { increment: 1 } },
      });
      if (claimed.count === 0) {
        artifact = await this.artifacts.findOne(artifact.id, actor);
        if (artifact.status === AiArtifactStatus.PUBLISHED) {
          return this.publish(artifact.id, publishNow, actor);
        }
        if (!artifact.publishedAssignmentId) {
          throw new ConflictException(
            "This artifact is already being published",
          );
        }
        assignmentId = artifact.publishedAssignmentId;
        linked = true;
      }
    }

    try {
      if (!assignmentId) {
        const created = await this.assignments.create(
          this.mapper.toCreateAssignmentDto(content),
          actor,
        );
        assignmentId = created.id;
        await this.prisma.aiContentArtifact.update({
          where: { id: artifact.id },
          data: { publishedAssignmentId: assignmentId },
        });
        linked = true;
      }

      let assignment = await this.assignments.findOne(assignmentId, actor);
      if (publishNow && !assignment.isPublished) {
        await this.assignments.update(
          assignmentId,
          { isPublished: true },
          actor,
        );
        assignment = await this.assignments.findOne(assignmentId, actor);
      }

      const publishedAt = new Date();
      const [updatedArtifact] = await this.prisma.$transaction([
        this.prisma.aiContentArtifact.update({
          where: { id: artifact.id },
          data: {
            status: AiArtifactStatus.PUBLISHED,
            publishedAssignmentId: assignmentId,
            publishedAt,
          },
        }),
        this.prisma.aiReviewEvent.create({
          data: {
            schoolId: artifact.schoolId,
            artifactId: artifact.id,
            reviewerId: actor.id,
            decision: AiReviewDecision.PUBLISHED,
            contentHash: artifact.contentHash,
            metadata: {
              assignmentId,
              publishedToStudents: publishNow,
            },
          },
        }),
      ]);

      void this.audit.record({
        action: "ai.artifact.published",
        schoolId: artifact.schoolId,
        userId: actor.id,
        resource: `AiContentArtifact:${artifact.id}`,
        metadata: { assignmentId, publishedToStudents: publishNow },
      });
      return { assignmentId, assignment, artifact: updatedArtifact };
    } catch (error) {
      if (assignmentId) {
        try {
          await this.assignments.update(
            assignmentId,
            { isPublished: false },
            actor,
          );
          if (!linked) {
            await this.assignments.remove(assignmentId, actor);
          }
        } catch {
          // Preserve the original failure. Any linked assignment is forced
          // back to draft where possible, so students never see a partial
          // publish.
        }
      }
      throw error;
    }
  }
}
