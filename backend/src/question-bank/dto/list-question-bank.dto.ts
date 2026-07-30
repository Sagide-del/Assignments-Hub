import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { QuestionBankStatus } from "@prisma/client";

export class ListQuestionBankDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  grade?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  topic?: string;

  // Admin-only filter (ignored on the teacher read-only routes, which are
  // always scoped to APPROVED — see QuestionBankService.browse).
  @IsOptional()
  @IsEnum(QuestionBankStatus)
  status?: QuestionBankStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}
