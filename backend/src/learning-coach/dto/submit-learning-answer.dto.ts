import { IsInt, IsString, MaxLength, Min } from 'class-validator';

export class SubmitLearningAnswerDto {
  @IsInt()
  @Min(1)
  questionId!: number;

  @IsString()
  @MaxLength(5000)
  answer!: string;
}
