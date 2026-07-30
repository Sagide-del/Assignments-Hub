import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import {
  AiArtifactStatus,
  AiExtractionStatus,
  AiFeature,
  AiJobStatus,
} from "@prisma/client";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { AuditAction } from "../common/decorators/audit.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { OptionalParseIntPipe } from "../common/pipes/optional-parse-int.pipe";
import { AiArtifactService } from "./ai-artifact.service";
import { AiExtractionService } from "./ai-extraction.service";
import { AiFeatureConfigService } from "./ai-feature-config.service";
import { AiMonitoringService } from "./ai-monitoring.service";
import { AiPublishService } from "./ai-publish.service";
import { AiQueueService } from "./ai-queue.service";
import { AiQuotaService } from "./ai-quota.service";
import { AiTopicAssignmentService } from "./ai-topic-assignment.service";
import { RequiresAiFeature } from "./decorators/ai-feature.decorator";
import { CreateAiExtractionDto } from "./dto/create-ai-extraction.dto";
import { GenerateTopicAssignmentDto } from "./dto/generate-topic-assignment.dto";
import { ListAiGenerationsDto } from "./dto/list-ai-generations.dto";
import { ListAiTopicsDto } from "./dto/list-ai-topics.dto";
import { PublishAiArtifactDto } from "./dto/publish-ai-artifact.dto";
import {
  ApproveAiArtifactDto,
  RejectAiArtifactDto,
} from "./dto/review-ai-artifact.dto";
import { UpdateAiArtifactDto } from "./dto/update-ai-artifact.dto";
import { UpdateAiFeatureConfigDto } from "./dto/update-ai-feature-config.dto";
import { AiFeatureGuard } from "./guards/ai-feature.guard";
import { AiQuotaGuard } from "./guards/ai-quota.guard";

const STAFF_ROLES = [Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN];

@ApiTags("AI Content")
@ApiBearerAuth()
@Controller("ai")
@Roles(...STAFF_ROLES)
@RequiresAiFeature(AiFeature.ASSIGNMENT_DRAFT)
export class AiContentController {
  constructor(
    private readonly extractions: AiExtractionService,
    private readonly generations: AiTopicAssignmentService,
    private readonly artifacts: AiArtifactService,
    private readonly publishing: AiPublishService,
    private readonly featureConfig: AiFeatureConfigService,
    private readonly quota: AiQuotaService,
    private readonly queue: AiQueueService,
    private readonly monitoring: AiMonitoringService,
  ) {}

  @Post("pdf/upload")
  @UseGuards(AiFeatureGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { files: 1, fileSize: 15 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: "Upload a PDF and queue topic extraction" })
  @ApiConsumes("multipart/form-data")
  @ApiHeader({
    name: "Idempotency-Key",
    required: true,
    description: "Unique per school and upload intent",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["file", "subject"],
      properties: {
        file: { type: "string", format: "binary" },
        subject: { type: "string", example: "Biology" },
        grade: { type: "string", example: "Grade 10" },
      },
    },
  })
  @ApiCreatedResponse({ description: "Extraction accepted for processing" })
  @ApiBadRequestResponse({ description: "Invalid PDF or request fields" })
  @ApiForbiddenResponse({ description: "Feature disabled or role denied" })
  @AuditAction("ai.pdf.upload")
  async uploadPdf(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateAiExtractionDto,
    @Headers("idempotency-key") idempotencyKey: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const extraction = await this.extractions.createExtraction(
      file,
      dto,
      idempotencyKey,
      actor,
    );
    if (
      extraction.status === AiExtractionStatus.PROCESSING &&
      !extraction.startedAt
    ) {
      await this.queue.enqueueExtraction(extraction.id);
    }
    return {
      id: extraction.id,
      status: extraction.status,
      fileName: extraction.fileName,
      subject: extraction.subject,
      grade: extraction.grade,
      topicCount: extraction.topicCount,
      createdAt: extraction.createdAt,
    };
  }

  @Get("pdf/:id/content")
  @UseGuards(AiFeatureGuard)
  @ApiOperation({ summary: "Get extraction status and structured topics" })
  @ApiParam({ name: "id", type: Number })
  @ApiOkResponse({ description: "School-scoped PDF extraction content" })
  @ApiNotFoundResponse({ description: "Extraction not found in this tenant" })
  pdfContent(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.extractions.getContent(id, actor);
  }

  @Get("topics")
  @UseGuards(AiFeatureGuard)
  @ApiOperation({ summary: "Browse extracted topics for the current school" })
  @ApiOkResponse({ description: "Paginated school topic catalogue" })
  topics(
    @Query() query: ListAiTopicsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.extractions.listTopics(actor, query);
  }

  @Post("assignments/generate")
  @UseGuards(AiFeatureGuard, AiQuotaGuard)
  @ApiOperation({ summary: "Queue assignment generation from a topic" })
  @ApiHeader({
    name: "Idempotency-Key",
    required: true,
    description: "Unique per school and generation parameters",
  })
  @ApiCreatedResponse({ description: "Generation job queued" })
  @ApiForbiddenResponse({ description: "Feature or quota unavailable" })
  @AuditAction("ai.assignment.generate")
  async generate(
    @Body() dto: GenerateTopicAssignmentDto,
    @Headers("idempotency-key") idempotencyKey: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const job = await this.generations.createJob(dto, idempotencyKey, actor);
    if (job.status === AiJobStatus.QUEUED) {
      await this.queue.enqueueGeneration(job.id);
    }
    return {
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
    };
  }

  // Static route must be declared before assignments/:id.
  @Get("assignments/generations")
  @UseGuards(AiFeatureGuard)
  @ApiOperation({ summary: "List school-scoped AI generation jobs" })
  @ApiOkResponse({ description: "Paginated generation history" })
  listGenerations(
    @Query() query: ListAiGenerationsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.generations.listJobs(actor, query);
  }

  @Get("assignments/:id")
  @UseGuards(AiFeatureGuard)
  @ApiOperation({ summary: "Get a generated assignment artifact" })
  @ApiParam({ name: "id", type: Number })
  @ApiOkResponse({
    description:
      "Artifact including correct answers for authorized staff review",
  })
  @ApiNotFoundResponse({ description: "Artifact not found in this tenant" })
  assignment(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.artifacts.findOne(id, actor);
  }

  @Patch("assignments/:id/edit")
  @UseGuards(AiFeatureGuard)
  @ApiOperation({ summary: "Edit and version a generated artifact" })
  @ApiParam({ name: "id", type: Number })
  @ApiOkResponse({ description: "Updated artifact with incremented version" })
  @AuditAction("ai.assignment.edit")
  edit(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateAiArtifactDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.artifacts.updateContent(id, dto.content, actor);
  }

  @Post("assignments/:id/approve")
  @UseGuards(AiFeatureGuard)
  @ApiOperation({
    summary: "Validate and approve a generated assignment artifact",
  })
  @ApiParam({ name: "id", type: Number })
  @ApiOkResponse({ description: "Artifact approved by a human reviewer" })
  @ApiBadRequestResponse({ description: "Artifact validation failed" })
  @AuditAction("ai.assignment.approve")
  async approve(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ApproveAiArtifactDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.artifacts.validate(id, actor);
    return this.artifacts.approve(id, dto.notes, actor);
  }

  @Post("assignments/:id/publish")
  @UseGuards(AiFeatureGuard)
  @ApiOperation({
    summary: "Create an assignment from an approved artifact",
  })
  @ApiParam({ name: "id", type: Number })
  @ApiOkResponse({
    description:
      "Existing AssignmentsService result and linked artifact provenance",
  })
  @ApiBadRequestResponse({ description: "Artifact is not approved" })
  @AuditAction("ai.assignment.publish")
  publish(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: PublishAiArtifactDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.publishing.publish(id, dto.publishNow ?? false, actor);
  }

  @Post("assignments/:id/reject")
  @UseGuards(AiFeatureGuard)
  @ApiOperation({ summary: "Reject a generated assignment artifact" })
  @ApiParam({ name: "id", type: Number })
  @ApiOkResponse({ description: "Artifact rejected with review notes" })
  @AuditAction("ai.assignment.reject")
  reject(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: RejectAiArtifactDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.artifacts.reject(id, dto.notes, actor);
  }

  @Get("quotas")
  @UseGuards(AiFeatureGuard)
  @ApiOperation({ summary: "Get the current school's AI generation quota" })
  @ApiOkResponse({ description: "Monthly reserved, used, and remaining quota" })
  quotas(@CurrentUser() actor: AuthenticatedUser) {
    return this.quota.getQuota(actor);
  }

  @Get("admin/features")
  @Roles(Role.PLATFORM_ADMIN)
  @ApiOperation({ summary: "List AI feature controls for schools" })
  @ApiQuery({ name: "schoolId", required: false, type: Number })
  @ApiOkResponse({
    description: "Platform-managed school feature configurations",
  })
  adminFeatures(
    @CurrentUser() actor: AuthenticatedUser,
    @Query("schoolId", new OptionalParseIntPipe()) schoolId?: number,
  ) {
    return this.featureConfig.getAdminFeatures(actor, schoolId);
  }

  @Patch("admin/features/:id")
  @Roles(Role.PLATFORM_ADMIN)
  @ApiOperation({ summary: "Update a school AI feature configuration" })
  @ApiParam({
    name: "id",
    description:
      "Configuration ID or stable schoolId:feature identifier returned by the list endpoint",
  })
  @ApiOkResponse({ description: "Updated feature configuration" })
  @AuditAction("ai.admin.feature.update")
  updateAdminFeature(
    @Param("id") id: string,
    @Body() dto: UpdateAiFeatureConfigDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.featureConfig.updateAdminFeature(id, dto, actor);
  }

  @Get("admin/monitoring")
  @Roles(Role.PLATFORM_ADMIN)
  @ApiOperation({ summary: "Get 30-day AI operational monitoring metrics" })
  @ApiOkResponse({
    description: "Jobs, failures, extraction, artifacts, usage, and schools",
  })
  monitoringDashboard(@CurrentUser() actor: AuthenticatedUser) {
    return this.monitoring.dashboard(actor);
  }
}
