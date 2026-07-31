import { Transform, Type } from "class-transformer";
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";
import { QuestionType } from "@prisma/client";
import { QUESTION_BANK_SOURCE_TEXT_MAX_CHARACTERS } from "../question-bank.constants";

// Multipart string fields arrive as "true"/"false", never a real boolean —
// this normalizes either form so @IsBoolean() below doesn't reject the
// string the browser's FormData actually sends.
function toBoolean({ value }: { value: unknown }) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.trim().toLowerCase() === "true";
  return value;
}

// Multipart form fields alongside the uploaded PDF (see
// QuestionBankController.generate) — all values arrive as strings, so
// numeric/array/boolean fields use @Type/@Transform/manual parsing rather
// than relying on the global ValidationPipe's `transform` alone for nested
// multipart bodies.
export class GenerateQuestionBankDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  subject: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  grade: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  topic: string;

  // 5-100 to match the generation form's slider. QUESTION_BANK_MIN_ACCEPTABLE_RATIO
  // still applies at any count, so a small request isn't treated specially.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(100)
  questionCount?: number = 60;

  @IsOptional()
  @IsIn(["EASY", "MEDIUM", "HARD", "MIXED"])
  difficulty?: "EASY" | "MEDIUM" | "HARD" | "MIXED" = "MIXED";

  // Sent as a JSON-encoded string in the multipart body (e.g.
  // '["MULTIPLE_CHOICE","SHORT_ANSWER"]") since multipart fields are always
  // strings — QuestionBankController parses it before validation.
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(QuestionType, { each: true })
  questionTypes?: QuestionType[];

  // PDF is still the default and only fully-supported source. TEXT reuses
  // the same prompt-building/normalization pipeline with pasted text
  // instead of PDF-extracted text — see QuestionBankService.generate. URL
  // and video-transcript inputs are intentionally not implemented yet (no
  // safe server-side fetcher / transcription service exists in this
  // codebase); the frontend only offers PDF/TEXT and shows the other two
  // as disabled "coming soon" options.
  @IsOptional()
  @IsIn(["PDF", "TEXT"])
  inputType?: "PDF" | "TEXT" = "PDF";

  // Required when inputType is TEXT (checked in QuestionBankService.generate,
  // not here, since the requirement is conditional on another field).
  @ValidateIf((dto: GenerateQuestionBankDto) => dto.inputType === "TEXT")
  @IsString()
  @MinLength(50)
  @MaxLength(QUESTION_BANK_SOURCE_TEXT_MAX_CHARACTERS)
  sourceText?: string;

  // Asks the model to give each question its own specific sub-topic
  // (QuestionBank.topic per row) instead of every row in the batch sharing
  // the one `topic` field above.
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  autoTagTopic?: boolean = false;

  // Asks the model to flag questions a diagram would help and suggest a
  // caption (stored as QuestionBank.diagramAlt). This never uploads or
  // generates an actual image — an admin still uploads the real diagram in
  // the review queue; the suggestion just tells them which questions to
  // prioritize.
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includeDiagramPlaceholders?: boolean = false;

  // Biases generation toward Analyze/Evaluate/Create-level questions
  // (Bloom's Taxonomy) rather than pure recall. Every generated question is
  // still classified with a bloomLevel regardless of this flag.
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  prioritizeHigherOrder?: boolean = false;
}
