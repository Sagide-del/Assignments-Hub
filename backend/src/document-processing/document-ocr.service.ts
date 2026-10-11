import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  Block,
  GetDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommandOutput,
  StartDocumentTextDetectionCommand,
  TextractClient,
} from '@aws-sdk/client-textract';
import { randomUUID } from 'crypto';

const POLL_INTERVAL_MS = 2_000;
const MAX_POLLS = 75;

@Injectable()
export class DocumentOcrService {
  private readonly logger = new Logger(DocumentOcrService.name);
  private readonly bucket: string;
  private readonly enabled: boolean;
  private readonly s3: S3Client | null;
  private readonly textract: TextractClient | null;

  constructor(config: ConfigService) {
    const region = config.get<string>('AWS_REGION')?.trim() || '';
    this.bucket = config.get<string>('AWS_S3_BUCKET')?.trim() || '';
    this.enabled = config.get<string>('AWS_TEXTRACT_OCR_ENABLED')?.trim().toLowerCase() === 'true';
    this.s3 = region ? new S3Client({ region }) : null;
    this.textract = region ? new TextractClient({ region }) : null;
  }

  async extractPdf(buffer: Buffer, existingStorageKey?: string) {
    this.assertConfigured();
    const temporaryKey = existingStorageKey
      ? null
      : `ocr-source/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.pdf`;
    const storageKey = existingStorageKey || temporaryKey!;

    if (temporaryKey) {
      await this.s3!.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: temporaryKey,
        Body: buffer,
        ContentType: 'application/pdf',
        ContentLength: buffer.length,
        ServerSideEncryption: 'AES256',
      }));
    }

    try {
      const started = await this.textract!.send(new StartDocumentTextDetectionCommand({
        DocumentLocation: { S3Object: { Bucket: this.bucket, Name: storageKey } },
      }));
      if (!started.JobId) throw new Error('Textract did not return a job ID');

      const blocks = await this.waitForResult(started.JobId);
      const text = blocks
        .filter((block) => block.BlockType === 'LINE' && block.Text)
        .map((block) => block.Text!.trim())
        .filter(Boolean)
        .join('\n')
        .trim();
      if (text.length < 50) {
        throw new BadRequestException(
          'OCR could not find enough readable text in this PDF. Use a clearer scan.',
        );
      }
      return text;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logger.error(`Textract OCR failed: ${this.errorMessage(error)}`);
      throw new ServiceUnavailableException(
        'Scanned PDF recognition is temporarily unavailable. Please try again.',
      );
    } finally {
      if (temporaryKey) {
        await this.s3!.send(new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: temporaryKey,
        })).catch((error) => {
          this.logger.warn(`Could not remove temporary OCR file: ${this.errorMessage(error)}`);
        });
      }
    }
  }

  private async waitForResult(jobId: string) {
    for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
      const firstPage = await this.textract!.send(
        new GetDocumentTextDetectionCommand({ JobId: jobId, MaxResults: 1_000 }),
      );
      if (firstPage.JobStatus === 'FAILED') {
        throw new Error(firstPage.StatusMessage || 'Textract rejected the document');
      }
      if (firstPage.JobStatus === 'SUCCEEDED' || firstPage.JobStatus === 'PARTIAL_SUCCESS') {
        return this.readAllPages(jobId, firstPage);
      }
      await this.delay(POLL_INTERVAL_MS);
    }
    throw new ServiceUnavailableException(
      'Scanned PDF recognition timed out. Please try a smaller document.',
    );
  }

  private async readAllPages(
    jobId: string,
    firstPage: GetDocumentTextDetectionCommandOutput,
  ) {
    const blocks: Block[] = [...(firstPage.Blocks ?? [])];
    let nextToken = firstPage.NextToken;
    while (nextToken) {
      const page = await this.textract!.send(new GetDocumentTextDetectionCommand({
        JobId: jobId,
        NextToken: nextToken,
        MaxResults: 1_000,
      }));
      blocks.push(...(page.Blocks ?? []));
      nextToken = page.NextToken;
    }
    return blocks;
  }

  private assertConfigured() {
    if (!this.enabled) {
      throw new BadRequestException(
        'This PDF appears to be scanned. OCR is not enabled for this deployment.',
      );
    }
    if (!this.bucket || !this.s3 || !this.textract) {
      throw new ServiceUnavailableException(
        'OCR requires AWS_REGION and AWS_S3_BUCKET configuration.',
      );
    }
  }

  private delay(milliseconds: number) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
