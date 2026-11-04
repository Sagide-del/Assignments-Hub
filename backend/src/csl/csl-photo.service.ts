import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import { UploadsService } from "../uploads/uploads.service";
@Injectable()
export class CslPhotoService {
  private readonly bucket: string;
  private readonly client: S3Client | null;
  constructor(
    private readonly config: ConfigService,
    private readonly uploads: UploadsService,
  ) {
    this.bucket = config.get<string>("AWS_S3_BUCKET")?.trim() ?? "";
    const region = config.get<string>("AWS_REGION");
    this.client = region ? new S3Client({ region }) : null;
  }
  async store(
    file: Express.Multer.File | undefined,
    school: number,
    student: number,
  ) {
    if (!file) return null;
    if (!file.buffer?.length || file.buffer.length > 5 * 1024 * 1024)
      throw new BadRequestException("Photo must be smaller than 5 MB.");
    let image: Buffer;
    try {
      const input = sharp(file.buffer, {
        limitInputPixels: 12000000,
        animated: false,
      });
      const meta = await input.metadata();
      if (!["jpeg", "png", "webp"].includes(meta.format ?? "")) throw Error();
      image = await input
        .rotate()
        .resize({
          width: 1200,
          height: 1200,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 78 })
        .toBuffer();
    } catch {
      throw new BadRequestException(
        "Use a JPEG, PNG or WebP photo no larger than 12 megapixels.",
      );
    }
    const saved = await this.uploads.uploadPrivate(
      {
        buffer: image,
        originalname: "csl-evidence.jpg",
        mimetype: "image/jpeg",
      } as Express.Multer.File,
      `marketplace-private/csl/${school}/${student}`,
    );
    return `s3://${this.bucket}/${saved.assetKey}`;
  }
  private key(url: string, school: number, student: number) {
    const prefix = `s3://${this.bucket}/marketplace-private/csl/${school}/${student}/`;
    if (!this.bucket || !this.client || !url.startsWith(prefix))
      throw new ServiceUnavailableException(
        "CSL evidence storage is unavailable.",
      );
    return url.slice(`s3://${this.bucket}/`.length);
  }
  async signed(url: string, school: number, student: number) {
    return this.uploads.createPrivateDownloadUrl(
      this.key(url, school, student),
      "csl-evidence.jpg",
      300,
    );
  }
  async image(url: string, school: number, student: number) {
    const key = this.key(url, school, student);
    const data = await this.client!.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if ((data.ContentLength ?? 0) > 2 * 1024 * 1024)
      throw new ServiceUnavailableException(
        "Evidence exceeds its rendering limit.",
      );
    const parts: Buffer[] = [];
    let length = 0;
    for await (const chunk of data.Body as any) {
      length += chunk.length;
      if (length > 2 * 1024 * 1024)
        throw new ServiceUnavailableException(
          "Evidence exceeds its rendering limit.",
        );
      parts.push(Buffer.from(chunk));
    }
    return Buffer.concat(parts);
  }
  async storageContext() {
    let principal: string | null = null;
    try {
      const sts = new STSClient({
        region: this.config.get<string>("AWS_REGION"),
        credentials: this.client?.config.credentials,
      });
      principal =
        (
          await sts.send(new GetCallerIdentityCommand({}), {
            abortSignal: AbortSignal.timeout(10000),
          })
        ).Arn ?? null;
      sts.destroy();
    } catch {}
    return {
      principal_arn: principal,
      bucket: this.bucket,
      region: this.config.get<string>("AWS_REGION") ?? null,
      prefix: "marketplace-private/csl/",
    };
  }
  async verifyStorage(school: number, actor: number) {
    let url: string | null = null,
      stage = "UPLOAD",
      read = false,
      cleanup = true,
      failed = false;
    try {
      const bytes = await sharp({
        create: { width: 2, height: 2, channels: 3, background: "#BBD125" },
      })
        .jpeg()
        .toBuffer();
      url = await this.store(
        {
          buffer: bytes,
          originalname: "csl-storage-check.jpg",
          mimetype: "image/jpeg",
        } as Express.Multer.File,
        school,
        actor,
      );
      if (!url) throw Error();
      stage = "READ";
      read = (await this.image(url, school, actor)).length > 0;
      if (!read) throw Error();
    } catch {
      failed = true;
    } finally {
      if (url) {
        try {
          await this.remove(url, school, actor);
        } catch {
          cleanup = false;
        }
      }
    }
    return {
      photo_storage_verified: read && !failed,
      diagnostic_cleanup_verified: cleanup,
      ...(failed || !cleanup
        ? {
            failure_stage: failed ? stage : "DELETE",
            storage_diagnostic: await this.storageContext(),
          }
        : {}),
    };
  }
  configured() {
    return Boolean(this.bucket && this.client);
  }
  async schoolLogo(url: string) {
    try {
      if (!this.client) return null;
      const parsed = new URL(url),
        region = this.config.get<string>("AWS_REGION");
      const cdn = this.config
        .get<string>("AWS_CDN_BASE_URL")
        ?.replace(/\/+$/, "");
      const base = `https://${this.bucket}.s3.${region}.amazonaws.com`;
      const origin = cdn && url.startsWith(cdn + "/") ? cdn : base;
      if (!url.startsWith(origin + "/") || parsed.search || parsed.hash)
        return null;
      const key = decodeURIComponent(url.slice(origin.length + 1));
      if (
        !/^(uploads|branding)\/[a-zA-Z0-9/_ .-]+$/.test(key) ||
        key.split("/").includes("..")
      )
        return null;
      const object = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { abortSignal: AbortSignal.timeout(10000) },
      );
      if ((object.ContentLength ?? 0) > 1024 * 1024) return null;
      const parts: Buffer[] = [];
      let size = 0;
      for await (const c of object.Body as any) {
        size += c.length;
        if (size > 1024 * 1024) return null;
        parts.push(Buffer.from(c));
      }
      const bytes = Buffer.concat(parts);
      const raster =
        (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
        bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
        (bytes.toString("ascii", 0, 4) === "RIFF" &&
          bytes.toString("ascii", 8, 12) === "WEBP");
      if (!raster) return null;
      const png = await sharp(bytes, {
        limitInputPixels: 12000000,
      })
        .resize({ width: 100, height: 100, fit: "inside" })
        .png()
        .toBuffer();
      return "data:image/png;base64," + png.toString("base64");
    } catch {
      return null;
    }
  }
  async remove(url: string, school: number, student: number) {
    await this.client!.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: this.key(url, school, student),
      }),
    );
  }
}
