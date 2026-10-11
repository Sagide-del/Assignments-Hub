import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';

const EMBEDDING_BATCH_SIZE = 64;

@Injectable()
export class QuestionBankEmbeddingService {
  private readonly logger = new Logger(QuestionBankEmbeddingService.name);
  private readonly client: OpenAI | null;
  private readonly model: string;
  private readonly provider: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const apiKey = config.get<string>('EMBEDDING_API_KEY')?.trim()
      || config.get<string>('OPENAI_API_KEY')?.trim()
      || '';
    const baseURL = config.get<string>('EMBEDDING_BASE_URL')?.trim() || undefined;
    this.model = config.get<string>('EMBEDDING_MODEL')?.trim() || 'text-embedding-3-small';
    this.provider = config.get<string>('EMBEDDING_PROVIDER')?.trim() || 'OPENAI_COMPATIBLE';
    this.client = apiKey ? new OpenAI({ apiKey, baseURL }) : null;
  }

  isConfigured() {
    return this.client !== null;
  }

  async indexDocument(documentId: number) {
    if (!this.client) return { configured: false, indexed: 0 };

    const chunks = await this.prisma.questionBankSourceChunk.findMany({
      where: {
        documentId,
        OR: [
          { embedding: null },
          { embedding: { is: { model: { not: this.model } } } },
        ],
      },
      select: { id: true, content: true },
      orderBy: { ordinal: 'asc' },
    });
    if (!chunks.length) return { configured: true, indexed: 0 };

    let indexed = 0;
    try {
      for (let offset = 0; offset < chunks.length; offset += EMBEDDING_BATCH_SIZE) {
        const batch = chunks.slice(offset, offset + EMBEDDING_BATCH_SIZE);
        const response = await this.client.embeddings.create({
          model: this.model,
          input: batch.map((chunk) => chunk.content),
          encoding_format: 'float',
        });
        const vectorsByIndex = new Map(
          response.data.map((entry) => [entry.index, entry.embedding]),
        );
        await this.prisma.$transaction(
          batch.map((chunk, index) => {
            const vector = vectorsByIndex.get(index);
            if (!vector?.length) {
              throw new Error(`Embedding provider omitted chunk ${chunk.id}`);
            }
            return this.prisma.questionBankChunkEmbedding.upsert({
              where: { chunkId: chunk.id },
              create: {
                chunkId: chunk.id,
                provider: this.provider,
                model: this.model,
                dimensions: vector.length,
                vector: vector as unknown as Prisma.InputJsonValue,
              },
              update: {
                provider: this.provider,
                model: this.model,
                dimensions: vector.length,
                vector: vector as unknown as Prisma.InputJsonValue,
              },
            });
          }),
        );
        indexed += batch.length;
      }
      return { configured: true, indexed };
    } catch (error) {
      this.logger.warn(
        `Embedding index failed for source ${documentId}; BM25 fallback remains active: ${this.errorMessage(error)}`,
      );
      return { configured: true, indexed, failed: true };
    }
  }

  async rankDocumentChunks(documentId: number, query: string) {
    if (!this.client || !query.trim()) return new Map<number, number>();

    await this.indexDocument(documentId);
    try {
      const queryResponse = await this.client.embeddings.create({
        model: this.model,
        input: query.trim(),
        encoding_format: 'float',
      });
      const queryVector = queryResponse.data[0]?.embedding;
      if (!queryVector?.length) return new Map<number, number>();

      const embeddings = await this.prisma.questionBankChunkEmbedding.findMany({
        where: { chunk: { documentId }, model: this.model },
        select: { chunkId: true, dimensions: true, vector: true },
      });
      const scores = new Map<number, number>();
      for (const embedding of embeddings) {
        const vector = this.parseVector(embedding.vector);
        if (!vector || vector.length !== queryVector.length || vector.length !== embedding.dimensions) {
          continue;
        }
        scores.set(embedding.chunkId, this.cosineSimilarity(queryVector, vector));
      }
      return scores;
    } catch (error) {
      this.logger.warn(
        `Vector retrieval failed for source ${documentId}; using BM25: ${this.errorMessage(error)}`,
      );
      return new Map<number, number>();
    }
  }

  private parseVector(value: Prisma.JsonValue) {
    if (!Array.isArray(value) || !value.every((item) => typeof item === 'number')) return null;
    return value as number[];
  }

  private cosineSimilarity(left: number[], right: number[]) {
    let dot = 0;
    let leftMagnitude = 0;
    let rightMagnitude = 0;
    for (let index = 0; index < left.length; index += 1) {
      dot += left[index] * right[index];
      leftMagnitude += left[index] ** 2;
      rightMagnitude += right[index] ** 2;
    }
    const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);
    return denominator ? dot / denominator : 0;
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
