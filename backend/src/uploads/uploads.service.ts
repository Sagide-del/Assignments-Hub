import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomBytes } from 'crypto';
import { extname } from 'path';

interface UploadBufferInput {
  body: Buffer;
  filename: string;
  contentType: string;
  folder?: string;
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly bucket: string;
  private readonly region: string;
  private readonly publicBaseUrl: string;
  private readonly s3Client: S3Client | null;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('AWS_S3_BUCKET')?.trim() ?? '';
    this.region = this.config.get<string>('AWS_REGION')?.trim() ?? '';
    this.publicBaseUrl =
      this.config.get<string>('AWS_CDN_BASE_URL')?.trim().replace(/\/+$/, '') ??
      '';
    this.s3Client = this.region ? new S3Client({ region: this.region }) : null;
  }

  async upload(file: Express.Multer.File) {
    return this.uploadBuffer({
      body: file.buffer,
      filename: file.originalname,
      contentType: file.mimetype,
    });
  }

  async uploadBuffer({
    body,
    filename,
    contentType,
    folder = 'uploads',
  }: UploadBufferInput) {
    if (!this.bucket || !this.region || !this.s3Client) {
      throw new ServiceUnavailableException(
        'File storage is not configured. Set AWS_REGION and AWS_S3_BUCKET.',
      );
    }

    const now = new Date();
    const extension = extname(filename).toLowerCase().slice(0, 10);
    const uniqueName = `${Date.now()}-${randomBytes(8).toString('hex')}${extension}`;
    const key = [
      folder.replace(/[^a-zA-Z0-9/_-]/g, '').replace(/^\/+|\/+$/g, '') ||
        'uploads',
      now.getUTCFullYear().toString(),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
      uniqueName,
    ].join('/');

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentLength: body.length,
          ContentType: contentType,
          ContentDisposition: 'inline',
          CacheControl: 'public, max-age=31536000, immutable',
          ServerSideEncryption: 'AES256',
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown S3 error';
      this.logger.error(`S3 upload failed: ${message}`);
      throw new InternalServerErrorException('File upload failed');
    }

    return {
      url: this.buildPublicUrl(key),
      filename,
      size: body.length,
    };
  }

  private buildPublicUrl(key: string) {
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');

    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl}/${encodedKey}`;
    }

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${encodedKey}`;
  }
}
