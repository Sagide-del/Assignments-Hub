import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { QuestionType } from "@prisma/client";
import type { AiDifficulty } from "../interfaces/ai-content.types";

export enum AiDifficultyDto {
  EASY = "EASY",
  MEDIUM = "MEDIUM",
  HARD = "HARD",
  MIXED = "MIXED",
}

export class GenerateTopicAssignmentDto {
  @ApiProperty({ example: "42:photosynthesis-1" })
  @IsString()
  @MaxLength(160)
  topicId: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  subtopicIds?: string[];

  @ApiProperty({ minimum: 5, maximum: 20, default: 10 })
  @IsInt()
  @Min(5)
  @Max(20)
  questionCount: number;

  @ApiProperty({ enum: AiDifficultyDto })
  @IsEnum(AiDifficultyDto)
  difficulty: AiDifficulty;

  @ApiProperty({
    enum: QuestionType,
    isArray: true,
    example: [QuestionType.MULTIPLE_CHOICE, QuestionType.SHORT_ANSWER],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(QuestionType, { each: true })
  questionTypes: QuestionType[];
}
