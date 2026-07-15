import { IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { QuestionType } from '@prisma/client';

// Mirrors assignments/dto/create-question.dto.ts — same auto-grading rule
// (MULTIPLE_CHOICE/TRUE_FALSE/FILL_BLANK scored against correctAnswer, see
// LabSessionsService.autoGrade).
export class CreateLabQuestionDto {
  @IsString()
  @MinLength(1)
  questionText: string;

  @IsOptional()
  @IsEnum(QuestionType)
  questionType?: QuestionType;

  // Only meaningful for MULTIPLE_CHOICE.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  // Never sent back to students — LabsService strips it for STUDENT actors.
  @IsOptional()
  @IsString()
  correctAnswer?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  points?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
