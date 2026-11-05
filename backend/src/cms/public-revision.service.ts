import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash } from "crypto";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  Equals,
  IsArray,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { PrismaService } from "../prisma/prisma.service";

export class PublicSamplesDto {
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(199, { each: true })
  question_indices!: number[];
  @IsString() @MinLength(120) @MaxLength(1800) introduction!: string;
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MinLength(25, { each: true })
  @MaxLength(500, { each: true })
  guidance!: string[];
  @Equals(true) rights_confirmed!: boolean;
}
const object = (v: unknown): Record<string, any> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, any>)
    : {};
function text(v: unknown, min = 1, max = 3000): string {
  if (
    typeof v !== "string" ||
    v.trim().length < min ||
    v.length > max ||
    /[<>\u0000-\u0008]/.test(v)
  )
    throw new BadRequestException(
      "Public samples need plain text, complete answers and explanations.",
    );
  return v.trim();
}
export function revisionFingerprint(m: any): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        m.grade,
        m.subject,
        m.topic,
        object(m.content_json).questions,
      ]),
    )
    .digest("hex");
}
export function selectPublicQuestions(questions: unknown, indices: number[]) {
  if (
    !Array.isArray(questions) ||
    indices.length < 3 ||
    indices.length > 5 ||
    new Set(indices).size !== indices.length
  )
    throw new BadRequestException("Select 3–5 distinct questions.");
  return indices.map((index) => {
    if (!Number.isInteger(index) || index < 0 || index >= questions.length)
      throw new BadRequestException("Invalid sample selection.");
    const q = object(questions[index]);
    if (!Array.isArray(q.options) || q.options.length !== 4)
      throw new BadRequestException(
        "Select questions with four answer options.",
      );
    const options = q.options.map((v: unknown) => text(v, 1, 1000));
    const answer = options.indexOf(q.correct_answer);
    if (answer < 0 || new Set(options).size !== 4)
      throw new BadRequestException("Each sample needs an unambiguous answer.");
    // No asset URLs, raw SVG, grading configuration, source records or private metadata.
    // Diagram-dependent questions must stay private until a public diagram is supplied.
    if (q.illustration || q.asset_url)
      throw new BadRequestException(
        "Choose text-only samples; diagram questions need a separately reviewed public illustration.",
      );
    return {
      prompt: text(q.question_text),
      options,
      answer,
      explanation: text(q.explanation, 40),
    };
  });
}
export function publicTopic(m: any) {
  const saved = object(object(m.content_json).public_revision);
  if (
    m.status !== "APPROVED" ||
    m.tenant_id ||
    saved.version !== 1 ||
    saved.fingerprint !== revisionFingerprint(m)
  )
    return null;
  try {
    // Revalidate the frozen whitelist on every export; never spread a module payload.
    const questions = selectPublicQuestions(
      saved.questions.map((q: any) => ({
        question_text: q.prompt,
        options: q.options,
        correct_answer: q.options[q.answer],
        explanation: q.explanation,
      })),
      saved.questions.map((_: any, i: number) => i),
    );
    return {
      grade: m.grade,
      subject: text(m.subject, 1, 150),
      topic: text(m.topic, 1, 300),
      introduction: text(saved.introduction, 120, 1800),
      tips: saved.guidance.map((v: unknown) => text(v, 25, 500)),
      questions,
    };
  } catch {
    return null;
  }
}
@Injectable()
export class PublicRevisionService {
  constructor(private readonly prisma: PrismaService) {}
  async publish(id: string, dto: PublicSamplesDto, reviewer: number) {
    if (dto.rights_confirmed !== true)
      throw new BadRequestException("Confirm publication rights.");
    const m = await this.prisma.masterModule.findUnique({ where: { id } });
    if (!m) throw new NotFoundException();
    if (m.status !== "APPROVED" || m.tenant_id)
      throw new BadRequestException(
        "Only approved global content can supply public samples.",
      );
    const content = object(m.content_json);
    const snapshot = {
      version: 1,
      fingerprint: revisionFingerprint(m),
      reviewed_by: reviewer,
      reviewed_at: new Date().toISOString(),
      introduction: text(dto.introduction, 120, 1800),
      guidance: dto.guidance.map((v) => text(v, 25, 500)),
      questions: selectPublicQuestions(content.questions, dto.question_indices),
    };
    const result = await this.prisma.masterModule.updateMany({
      where: {
        id,
        status: "APPROVED",
        tenant_id: null,
        content_json: { equals: m.content_json as Prisma.InputJsonObject },
      },
      data: {
        content_json: {
          ...content,
          public_revision: snapshot,
        } as Prisma.InputJsonObject,
      },
    });
    if (result.count !== 1)
      throw new ConflictException("Content changed. Reload and review again.");
    return {
      approved: true,
      deployment_required: true,
      message: "Samples approved for the next public-site deployment.",
    };
  }
  async withdraw(id: string) {
    const m = await this.prisma.masterModule.findUnique({ where: { id } });
    if (!m) throw new NotFoundException();
    const { public_revision: removed, ...content } = object(m.content_json);
    const result = await this.prisma.masterModule.updateMany({
      where: {
        id,
        content_json: { equals: m.content_json as Prisma.InputJsonObject },
      },
      data: { content_json: content as Prisma.InputJsonObject },
    });
    if (result.count !== 1)
      throw new ConflictException("Content changed. Reload and try again.");
    return {
      approved: false,
      deployment_required: true,
      message:
        "Withdrawn from the export. Redeploy the public site to remove cached pages.",
    };
  }
  async catalogue() {
    const [modules, taxonomy] = await Promise.all([
      this.prisma.masterModule.findMany({
        where: {
          status: "APPROVED",
          tenant_id: null,
          content_json: { path: ["public_revision", "version"], equals: 1 },
        },
        select: {
          grade: true,
          subject: true,
          topic: true,
          status: true,
          tenant_id: true,
          content_json: true,
        },
        orderBy: [
          { grade: "asc" },
          { subject: "asc" },
          { topic: "asc" },
          { updated_at: "desc" },
          { id: "asc" },
        ],
      }),
      this.prisma.curriculumTaxonomy.findMany({
        where: { grade: { gte: 1, lte: 12 } },
        select: { grade: true, subject: true, topics: true, verified: true },
        orderBy: [{ grade: "asc" }, { subject: "asc" }],
      }),
    ]);
    return {
      version: 1,
      topics: modules.map(publicTopic).filter(Boolean),
      taxonomy,
    };
  }
}
