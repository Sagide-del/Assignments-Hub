import { IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { QuestionType } from '@prisma/client';

export class CreateQuestionDto {
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

  // Only used for auto-gradable types (MULTIPLE_CHOICE, TRUE_FALSE,
  // FILL_BLANK) — see SubmissionsService.autoGrade. Never sent back to
  // students (AssignmentsService strips it for STUDENT actors).
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

  @IsOptional()
  @IsString()
  hint?: string;
}
