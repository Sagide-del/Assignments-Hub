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
import { QuestionType } from "@prisma/client";
import type { AiDifficulty } from "../interfaces/ai-content.types";

export enum AiDifficultyDto {
  EASY = "EASY",
  MEDIUM = "MEDIUM",
  HARD = "HARD",
  MIXED = "MIXED",
}

export class GenerateTopicAssignmentDto {
  @IsString()
  @MaxLength(160)
  topicId: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  subtopicIds?: string[];

  @IsInt()
  @Min(5)
  @Max(20)
  questionCount: number;

  @IsEnum(AiDifficultyDto)
  difficulty: AiDifficulty;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(QuestionType, { each: true })
  questionTypes: QuestionType[];
}
