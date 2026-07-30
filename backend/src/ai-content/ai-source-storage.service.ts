import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { sha256 } from "./ai-content.utils";

@Injectable()
export class AiSourceStorageService {
  private readonly logger = new Logger(AiSourceStorageService.name);
  private readonly bucket: string;
  private readonly client: S3Client | null;

  constructor(private readonly config: ConfigService) {
    const region = this.config.get<string>("AWS_REGION")?.trim() ?? "";
    this.bucket = this.config.get<string>("AWS_S3_BUCKET")?.trim() ?? "";
    this.client = region ? new S3Client({ region }) : null;
  }

  async putPdf(schoolId: number, body: Buffer) {
    this.assertConfigured();
    const digest = sha256(body);
    const key = `ai-source/${schoolId}/${digest}.pdf`;

    try {
      await this.client!.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentLength: body.length,
          ContentType: "application/pdf",
          ContentDisposition: "attachment",
          CacheControl: "private, no-store",
          ServerSideEncryption: "AES256",
          Metadata: { schoolId: String(schoolId), sha256: digest },
        }),
      );
    } catch (error) {
      this.logger.error("Failed to store AI source PDF", error as Error);
      throw new ServiceUnavailableException("AI source storage is unavailable");
    }

    return { storageKey: key, fileUrl: `s3://${this.bucket}/${key}` };
  }

  async getPdf(storageKey: string): Promise<Buffer> {
    this.assertConfigured();
    try {
      const response = await this.client!.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }),
      );
      if (!response.Body) {
        throw new Error("S3 returned an empty object body");
      }
      const bytes = await response.Body.transformToByteArray();
      return Buffer.from(bytes);
    } catch (error) {
      this.logger.error(
        `Failed to read AI source PDF "${storageKey}"`,
        error as Error,
      );
      throw new ServiceUnavailableException("AI source file is unavailable");
    }
  }

  private assertConfigured() {
    if (!this.bucket || !this.client) {
      throw new ServiceUnavailableException(
        "AI source storage is not configured. Set AWS_REGION and AWS_S3_BUCKET.",
      );
    }
  }
}
