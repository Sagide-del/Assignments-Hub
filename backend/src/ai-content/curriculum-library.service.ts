import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AiJobStatus, QuestionType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { AiExtractionService } from "./ai-extraction.service";
import { AiTopicAssignmentService } from "./ai-topic-assignment.service";
import { AiQueueService } from "./ai-queue.service";
import { AiPublishService } from "./ai-publish.service";
import { curriculumUnits } from "./curriculum-plan";
import {
  PopulateCurriculumDto,
  PublishCurriculumDto,
} from "./dto/populate-curriculum.dto";
import { sha256, compactError } from "./ai-content.utils";
import { normalizeGrade } from "../common/utils/grade.util";
@Injectable()
export class CurriculumLibraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly extraction: AiExtractionService,
    private readonly generation: AiTopicAssignmentService,
    private readonly queue: AiQueueService,
    private readonly publishing: AiPublishService,
  ) {}
  documents(actor: AuthenticatedUser) {
    return this.prisma.aiExtractedContent.findMany({
      where: { schoolId: actor.schoolId },
      select: {
        id: true,
        fileName: true,
        subject: true,
        grade: true,
        status: true,
        topicCount: true,
        error: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
  }
  async coverage(id: number, actor: AuthenticatedUser) {
    const document = await this.extraction.getContent(id, actor);
    if (document.schoolId !== actor.schoolId)
      throw new NotFoundException("Curriculum not found");
    if (document.status !== "COMPLETED") return { document, units: [] };
    const units = curriculumUnits(document.content);
    const jobs = await this.prisma.aiGenerationJob.findMany({
      where: { schoolId: actor.schoolId, extractedContentId: id },
      include: {
        artifacts: {
          select: { id: true, status: true, publishedAssignmentId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return {
      document,
      units: units.map((unit) => {
        const matching = jobs.filter((job) => {
          const p = job.parameters as {
            topicId?: string;
            subtopicIds?: string[];
          };
          return (
            p?.topicId === unit.topicId &&
            JSON.stringify([...(p.subtopicIds ?? [])].sort()) ===
              JSON.stringify([...unit.subtopicIds].sort())
          );
        });
        const job =
          matching.find((j) =>
            j.artifacts.some((a) => a.status === "PUBLISHED"),
          ) ??
          matching.find((j) =>
            j.artifacts.some((a) =>
              ["APPROVED", "IN_REVIEW", "GENERATED"].includes(a.status),
            ),
          ) ??
          matching[0];
        return {
          ...unit,
          jobId: job?.id ?? null,
          status: job?.status ?? "MISSING",
          error: job?.errorMessage ?? null,
          artifacts: job?.artifacts ?? [],
        };
      }),
    };
  }
  async populate(
    id: number,
    dto: PopulateCurriculumDto,
    actor: AuthenticatedUser,
  ) {
    if (dto.structureReviewed !== true)
      throw new BadRequestException(
        "Review the extracted curriculum structure first.",
      );
    const { document, units } = await this.coverage(id, actor);
    const grade = normalizeGrade(document.grade);
    if (
      document.status !== "COMPLETED" ||
      !grade ||
      !/^Grade (?:[1-9]|1[0-2])$/.test(grade)
    )
      throw new BadRequestException(
        "Use a completed curriculum extraction with a Grade 1–12 designation.",
      );
    if (dto.unitIds.some((key) => !units.some((u) => u.id === key)))
      throw new BadRequestException(
        "One or more units do not belong to this curriculum.",
      );
    const results = [];
    for (const unitId of dto.unitIds) {
      const unit = units.find((u) => u.id === unitId)!;
      try {
        if (
          unit.artifacts.some(
            (a) => !["REJECTED", "ARCHIVED"].includes(a.status),
          )
        ) {
          results.push({ unitId, status: "EXISTS", jobId: unit.jobId });
          continue;
        }
        if (unit.status === "RUNNING") {
          results.push({ unitId, status: "RUNNING", jobId: unit.jobId });
          continue;
        }
        if (unit.status === "QUEUED" && unit.jobId) {
          await this.queue.enqueueGeneration(unit.jobId);
          results.push({ unitId, status: "QUEUED", jobId: unit.jobId });
          continue;
        }
        const key = `curriculum-${id}-${sha256({ unitId, questionCount: dto.questionCount }).slice(0, 32)}-${unit.jobId ?? "first"}`;
        const job = await this.generation.createJob(
          {
            topicId: unit.topicId,
            subtopicIds: unit.subtopicIds,
            questionCount: dto.questionCount,
            difficulty: "MIXED",
            questionTypes: [
              QuestionType.MULTIPLE_CHOICE,
              QuestionType.TRUE_FALSE,
            ],
          },
          key,
          actor,
        );
        if (job.status === AiJobStatus.QUEUED)
          await this.queue.enqueueGeneration(job.id);
        results.push({ unitId, status: job.status, jobId: job.id });
      } catch (error) {
        results.push({ unitId, status: "ERROR", error: compactError(error) });
      }
    }
    return { results };
  }
  async publish(
    id: number,
    dto: PublishCurriculumDto,
    actor: AuthenticatedUser,
  ) {
    if (dto.reviewed !== true)
      throw new BadRequestException(
        "Review each selected assignment before publishing.",
      );
    const { units } = await this.coverage(id, actor);
    const allowed = new Set(units.flatMap((u) => u.artifacts.map((a) => a.id)));
    if (dto.artifactIds.some((key) => !allowed.has(key)))
      throw new BadRequestException(
        "Selected assignments must belong to this curriculum.",
      );
    const results = [];
    for (const artifactId of dto.artifactIds) {
      try {
        const published = await this.publishing.publish(
          artifactId,
          true,
          actor,
          "INDEPENDENT",
        );
        results.push({
          artifactId,
          status: "PUBLISHED",
          assignmentId: published.assignmentId,
        });
      } catch (error) {
        results.push({
          artifactId,
          status: "ERROR",
          error: compactError(error),
        });
      }
    }
    return { results };
  }
}
