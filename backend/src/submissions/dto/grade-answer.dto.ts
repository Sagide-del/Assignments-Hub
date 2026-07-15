import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GradeAnswerDto {
  @IsInt()
  questionId: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  pointsAwarded?: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}
