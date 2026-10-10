import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const CHUNK_SIZE = 2_500;
const MAX_RETRIEVED_CHUNKS = 12;
const BM25_K1 = 1.4;
const BM25_B = 0.75;
const STOP_WORDS = new Set([
  'and', 'the', 'for', 'with', 'from', 'that', 'this', 'into', 'are', 'was',
  'were', 'has', 'have', 'grade', 'form', 'topic', 'subject',
]);

@Injectable()
export class QuestionBankRetrievalService {
  constructor(private readonly prisma: PrismaService) {}

  async storeSource(input: {
    title: string;
    subject: string;
    grade: string;
    fileName?: string;
    sourceType: 'PDF' | 'TEXT';
    text: string;
    createdById: number;
  }) {
    const normalized = input.text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
    if (normalized.length < 50) {
      throw new BadRequestException('Source content is too short to index');
    }
    const contentHash = createHash('sha256').update(normalized).digest('hex');
    const existing = await this.prisma.questionBankSourceDocument.findUnique({
      where: {
        contentHash_subject_grade: {
          contentHash,
          subject: input.subject.trim(),
          grade: input.grade.trim(),
        },
      },
    });
    if (existing) return existing;

    const chunks = this.chunk(normalized);
    return this.prisma.questionBankSourceDocument.create({
      data: {
        title: input.title.trim(),
        subject: input.subject.trim(),
        grade: input.grade.trim(),
        fileName: input.fileName,
        sourceType: input.sourceType,
        contentHash,
        createdById: input.createdById,
        chunks: {
          create: chunks.map((content, ordinal) => ({
            ordinal,
            content,
            searchText: content.toLowerCase(),
          })),
        },
      },
    });
  }

  listSources() {
    return this.prisma.questionBankSourceDocument.findMany({
      select: {
        id: true,
        title: true,
        subject: true,
        grade: true,
        fileName: true,
        sourceType: true,
        createdAt: true,
        _count: { select: { chunks: true, questions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async retrieveText(documentId: number, query: string) {
    const source = await this.prisma.questionBankSourceDocument.findUnique({
      where: { id: documentId },
      include: { chunks: { orderBy: { ordinal: 'asc' } } },
    });
    if (!source) throw new NotFoundException('Knowledge source not found');

    const terms = Array.from(new Set(this.tokenize(query)));
    const chunkTokens = source.chunks.map((chunk) => this.tokenize(chunk.searchText));
    const averageLength = chunkTokens.length
      ? chunkTokens.reduce((sum, tokens) => sum + tokens.length, 0) / chunkTokens.length
      : 1;
    const documentFrequency = new Map<string, number>();
    for (const tokens of chunkTokens) {
      for (const term of new Set(tokens)) {
        documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
      }
    }
    const normalizedPhrase = terms.join(' ');
    const ranked = source.chunks
      .map((chunk, index) => {
        const tokens = chunkTokens[index];
        const frequencies = new Map<string, number>();
        for (const token of tokens) frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
        const score = terms.reduce((total, term) => {
          const frequency = frequencies.get(term) ?? 0;
          if (!frequency) return total;
          const containingChunks = documentFrequency.get(term) ?? 0;
          const inverseDocumentFrequency = Math.log(
            1 + (source.chunks.length - containingChunks + 0.5) / (containingChunks + 0.5),
          );
          const lengthNormalization = frequency
            + BM25_K1 * (1 - BM25_B + BM25_B * (tokens.length / averageLength));
          return total + inverseDocumentFrequency * ((frequency * (BM25_K1 + 1)) / lengthNormalization);
        }, 0);
        const phraseBonus = normalizedPhrase.length > 3
          && this.tokenize(chunk.searchText).join(' ').includes(normalizedPhrase)
          ? 2
          : 0;
        return { chunk, score: score + phraseBonus };
      })
      .sort((a, b) => b.score - a.score || a.chunk.ordinal - b.chunk.ordinal);
    const relevant = ranked.some((entry) => entry.score > 0)
      ? ranked.filter((entry) => entry.score > 0).slice(0, MAX_RETRIEVED_CHUNKS)
      : ranked.slice(0, MAX_RETRIEVED_CHUNKS);

    return {
      source,
      text: relevant.map((entry) => entry.chunk.content).join('\n\n'),
    };
  }

  private tokenize(value: string) {
    return value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((term) => this.stem(term))
      .filter((term) => term.length > 2 && !STOP_WORDS.has(term));
  }

  private stem(term: string) {
    if (term.length > 5 && term.endsWith('ies')) return `${term.slice(0, -3)}y`;
    if (term.length > 5 && term.endsWith('ing')) return term.slice(0, -3);
    if (term.length > 4 && term.endsWith('ed')) return term.slice(0, -2);
    if (term.length > 4 && term.endsWith('s')) return term.slice(0, -1);
    return term;
  }

  private chunk(text: string) {
    const paragraphs = text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
    const chunks: string[] = [];
    let current = '';
    for (const paragraph of paragraphs.length ? paragraphs : [text]) {
      if (paragraph.length > CHUNK_SIZE) {
        if (current) chunks.push(current);
        for (let start = 0; start < paragraph.length; start += CHUNK_SIZE) {
          chunks.push(paragraph.slice(start, start + CHUNK_SIZE));
        }
        current = '';
      } else if (!current || current.length + paragraph.length + 2 <= CHUNK_SIZE) {
        current = current ? `${current}\n\n${paragraph}` : paragraph;
      } else {
        chunks.push(current);
        current = paragraph;
      }
    }
    if (current) chunks.push(current);
    return chunks;
  }
}
