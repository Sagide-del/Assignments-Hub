import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class GenerateAssignmentDto {
  @IsString()
  grade: string;

  @IsString()
  subject: string;

  @IsString()
  topic: string;

  @IsOptional()
  @IsString()
  strand?: string;

  @IsOptional()
  @IsString()
  subStrand?: string;

  @IsNumber()
  @Min(1)
  numberOfQuestions: number;

  @IsArray()
  questionTypes: (
    | 'MULTIPLE_CHOICE'
    | 'ESSAY'
    | 'TRUE_FALSE'
    | 'FILL_BLANK'
  )[];
}