import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AssignmentKind } from '@prisma/client';

export class RotateQuestionBankDto {
  @IsString() @MinLength(2) @MaxLength(200)
  title: string;

  @IsString() @MinLength(2) @MaxLength(120)
  subject: string;

  @IsString() @MinLength(1) @MaxLength(50)
  grade: string;

  @IsString() @MinLength(2) @MaxLength(160)
  topic: string;

  @Type(() => Number) @IsInt() @Min(1) @Max(100)
  questionCount: number;

  @IsOptional() @IsIn(['EASY', 'MEDIUM', 'HARD', 'MIXED'])
  difficulty?: string;

  @IsOptional() @IsString() @MaxLength(100)
  targetClass?: string;

  @IsOptional() @IsString() @MaxLength(100)
  targetStream?: string;

  @IsOptional() @IsDateString()
  dueDate?: string;

  @IsOptional() @IsBoolean()
  isPublished?: boolean;

  @IsOptional() @IsBoolean()
  notifyParents?: boolean;

  @IsOptional() @IsEnum(AssignmentKind)
  kind?: AssignmentKind;
}
