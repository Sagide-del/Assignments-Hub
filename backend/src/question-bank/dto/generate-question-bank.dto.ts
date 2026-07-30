import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { QuestionType } from "@prisma/client";

// Multipart form fields alongside the uploaded PDF (see
// QuestionBankController.generate) — all values arrive as strings, so
// numeric/array fields use @Type/manual parsing rather than relying on the
// global ValidationPipe's `transform` alone for nested multipart bodies.
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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(20)
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
}
