import { IsInt, IsString } from 'class-validator';

export class AnswerInputDto {
  @IsInt()
  questionId: number;

  // Selected option text, "true"/"false", essay text, or an uploaded
  // file's URL (from POST /uploads/single) for FILE_UPLOAD questions.
  @IsString()
  answer: string;
}
