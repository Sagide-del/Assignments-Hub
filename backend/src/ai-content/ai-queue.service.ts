import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Job, Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { AiExtractionStatus, AiJobStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AiExtractionService } from "./ai-extraction.service";
import { AiTopicAssignmentService } from "./ai-topic-assignment.service";

const AI_QUEUE_NAME = "assignment-hub-ai-content";

type AiQueuePayload =
  | { type: "extract"; extractionId: number }
  | { type: "generate"; generationJobId: number };

@Injectable()
export class AiQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiQueueService.name);
  private connection: Redis | null = null;
  private workerConnection: Redis | null = null;
  private queue: Queue<AiQueuePayload> | null = null;
  private worker: Worker<AiQueuePayload> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly extractions: AiExtractionService,
    private readonly generations: AiTopicAssignmentService,
  ) {}

  async onModuleInit() {
    const redisUrl = this.config.get<string>("REDIS_URL")?.trim();
    if (!redisUrl) {
      this.logger.warn(
        "REDIS_URL is not configured; AI jobs will use the non-durable local development queue",
      );
      return;
    }

    this.connection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
    this.queue = new Queue<AiQueuePayload>(AI_QUEUE_NAME, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: { age: 86_400, count: 1_000 },
        removeOnFail: { age: 604_800, count: 5_000 },
      },
    });

    const workersEnabled =
      this.config.get<string>("AI_WORKERS_ENABLED")?.trim().toLowerCase() !==
      "false";
    if (!workersEnabled) {
      this.logger.log(
        "AI queue connected; worker processing is disabled in this process",
      );
      return;
    }

    this.workerConnection = this.connection.duplicate();
    this.worker = new Worker<AiQueuePayload>(
      AI_QUEUE_NAME,
      (job) => this.process(job),
      {
        connection: this.workerConnection,
        concurrency: this.workerConcurrency(),
      },
    );
    this.worker.on("failed", (job, error) => {
      this.logger.error(
        `AI queue job ${job?.id ?? "unknown"} failed: ${error.message}`,
      );
    });
    this.logger.log("BullMQ AI content worker started");
  }

  enqueueExtraction(extractionId: number) {
    return this.enqueue(
      "extract",
      { type: "extract", extractionId },
      `extract-${extractionId}`,
    );
  }

  enqueueGeneration(generationJobId: number) {
    return this.enqueue(
      "generate",
      { type: "generate", generationJobId },
      `generate-${generationJobId}`,
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
    await this.workerConnection?.quit();
    await this.connection?.quit();
  }

  private async enqueue(
    name: "extract" | "generate",
    payload: AiQueuePayload,
    jobId: string,
  ) {
    if (this.queue) {
      try {
        await this.queue.add(name, payload, { jobId });
        return { queued: true, mode: "bullmq" as const };
      } catch (error) {
        this.logger.error(`Could not enqueue ${name} job`, error as Error);
        throw new ServiceUnavailableException(
          "AI background processing is unavailable",
        );
      }
    }

    setImmediate(() => {
      void this.processPayload(payload).catch((error: unknown) => {
        this.logger.error(
          `Local AI ${name} job failed`,
          error instanceof Error ? error.stack : String(error),
        );
      });
    });
    return { queued: true, mode: "local" as const };
  }

  private async process(job: Job<AiQueuePayload>) {
    try {
      return await this.processPayload(job.data);
    } catch (error) {
      const attempts = job.opts.attempts ?? 1;
      if (job.attemptsMade + 1 < attempts) {
        await this.prepareRetry(job.data);
      }
      throw error;
    }
  }

  private processPayload(payload: AiQueuePayload) {
    if (payload.type === "extract") {
      return this.extractions.processExtraction(payload.extractionId);
    }
    return this.generations.processGeneration(payload.generationJobId);
  }

  private async prepareRetry(payload: AiQueuePayload) {
    if (payload.type === "extract") {
      await this.prisma.aiExtractedContent.updateMany({
        where: {
          id: payload.extractionId,
          status: AiExtractionStatus.FAILED,
        },
        data: {
          status: AiExtractionStatus.PROCESSING,
          startedAt: null,
          processedAt: null,
        },
      });
      return;
    }

    await this.prisma.aiGenerationJob.updateMany({
      where: {
        id: payload.generationJobId,
        status: AiJobStatus.FAILED,
      },
      data: {
        status: AiJobStatus.QUEUED,
        startedAt: null,
        completedAt: null,
      },
    });
  }

  private workerConcurrency() {
    const configured = Number(
      this.config.get<string>("AI_WORKER_CONCURRENCY") ?? "2",
    );
    return Number.isInteger(configured) && configured >= 1 && configured <= 20
      ? configured
      : 2;
  }
}
