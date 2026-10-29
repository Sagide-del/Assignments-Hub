import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes } from "crypto";
import { extname } from "path";

interface UploadBufferInput {
  body: Buffer;
  filename: string;
  contentType: string;
  folder?: string;
  privateObject?: boolean;
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly bucket: string;
  private readonly region: string;
  private readonly publicBaseUrl: string;
  private readonly s3Client: S3Client | null;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>("AWS_S3_BUCKET")?.trim() ?? "";
    this.region = this.config.get<string>("AWS_REGION")?.trim() ?? "";
    this.publicBaseUrl =
      this.config.get<string>("AWS_CDN_BASE_URL")?.trim().replace(/\/+$/, "") ??
      "";
    this.s3Client = this.region ? new S3Client({ region: this.region }) : null;
  }

  async readContentAsset(key: string, maxBytes = 50 * 1024 * 1024) {
    if (!this.bucket || !this.s3Client || !key.startsWith("content-ingestion/"))
      throw new ServiceUnavailableException(
        "Private ingestion storage is not configured.",
      );
    const object = await this.s3Client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if ((object.ContentLength ?? 0) > maxBytes)
      throw new ServiceUnavailableException(
        "Stored content exceeds its size limit.",
      );
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const data of object.Body as any) {
      size += data.length;
      if (size > maxBytes)
        throw new ServiceUnavailableException(
          "Stored content exceeds its size limit.",
        );
      chunks.push(Buffer.from(data));
    }
    return Buffer.concat(chunks);
  }
  async upload(file: Express.Multer.File) {
    return this.uploadBuffer({
      body: file.buffer,
      filename: file.originalname,
      contentType: file.mimetype,
    });
  }

  async uploadPrivate(
    file: Express.Multer.File,
    folder = "marketplace-private",
  ) {
    const stored = await this.storeBuffer({
      body: file.buffer,
      filename: file.originalname,
      contentType: file.mimetype,
      folder,
      privateObject: true,
    });
    return {
      assetKey: stored.key,
      filename: file.originalname,
      size: file.buffer.length,
    };
  }

  async createPrivateDownloadUrl(
    assetKey: string,
    fileName: string,
    expiresInSeconds = 300,
  ) {
    if (!this.bucket || !this.s3Client) {
      throw new ServiceUnavailableException("File storage is not configured.");
    }
    if (!assetKey.startsWith("marketplace-private/")) {
      throw new InternalServerErrorException("Invalid private resource key");
    }
    return getSignedUrl(
      this.s3Client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: assetKey,
        ResponseContentDisposition: `attachment; filename="${fileName.replace(/["\r\n]/g, "")}"`,
      }),
      { expiresIn: expiresInSeconds },
    );
  }

  async uploadBuffer({
    body,
    filename,
    contentType,
    folder = "uploads",
  }: UploadBufferInput) {
    const stored = await this.storeBuffer({
      body,
      filename,
      contentType,
      folder,
    });
    return {
      url: this.buildPublicUrl(stored.key),
      filename,
      size: body.length,
    };
  }

  private async storeBuffer({
    body,
    filename,
    contentType,
    folder = "uploads",
    privateObject = false,
  }: UploadBufferInput) {
    if (!this.bucket || !this.region || !this.s3Client) {
      throw new ServiceUnavailableException(
        "File storage is not configured. Set AWS_REGION and AWS_S3_BUCKET.",
      );
    }

    const now = new Date();
    const extension = extname(filename).toLowerCase().slice(0, 10);
    const uniqueName = `${Date.now()}-${randomBytes(8).toString("hex")}${extension}`;
    const key = [
      folder.replace(/[^a-zA-Z0-9/_-]/g, "").replace(/^\/+|\/+$/g, "") ||
        "uploads",
      now.getUTCFullYear().toString(),
      String(now.getUTCMonth() + 1).padStart(2, "0"),
      uniqueName,
    ].join("/");

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentLength: body.length,
          ContentType: contentType,
          ContentDisposition: privateObject ? "attachment" : "inline",
          CacheControl: privateObject
            ? "private, no-store"
            : "public, max-age=31536000, immutable",
          ServerSideEncryption: "AES256",
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown S3 error";
      const errorName = error instanceof Error ? error.name : "UnknownError";
      this.logger.error(
        `S3 upload failed for ${key}: ${errorName}: ${message}`,
      );
      if (errorName === "AccessDenied" || errorName === "Forbidden") {
        throw new ServiceUnavailableException(
          "File storage permission is not configured for marketplace uploads.",
        );
      }
      throw new InternalServerErrorException("File upload failed");
    }

    return { key };
  }

  private buildPublicUrl(key: string) {
    const encodedKey = key.split("/").map(encodeURIComponent).join("/");

    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl}/${encodedKey}`;
    }

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${encodedKey}`;
  }
}
