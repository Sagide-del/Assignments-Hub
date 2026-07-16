import { IsArray, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { GradeAnswerDto } from './grade-answer.dto';

export class GradeSubmissionDto {
  // Optional overall score override. If omitted and `answers` is provided
  // (or the submission already has graded answers), the service computes
  // it as the sum of every Answer.pointsAwarded instead.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  score?: number;

  // Overall feedback shown to the student alongside their score.
  @IsOptional()
  @IsString()
  feedback?: string;

  // Per-question points/feedback — used to grade essay/file-upload answers
  // that couldn't be auto-graded, or to override an auto-graded answer.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeAnswerDto)
  answers?: GradeAnswerDto[];
}
