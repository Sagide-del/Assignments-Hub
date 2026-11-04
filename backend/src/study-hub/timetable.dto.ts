import { Type } from "class-transformer";
import {
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
  Length,
} from "class-validator";
export class GenerateTimetableDto {
  @IsOptional() @IsBoolean() regenerate?: boolean;
}
export class CompleteStudyBlockDto {
  @IsString() @Length(24, 24) block_id!: string;
  @IsBoolean() completed!: boolean;
  @IsString() @Length(36, 36) revision!: string;
}
class QuizAnswerDto {
  @IsInt() @Min(0) question_index!: number;
  @IsString() @MaxLength(1500) answer!: string;
}
export class QuizSubmissionDto {
  @IsString() @Length(36, 36) revision!: string;
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers!: QuizAnswerDto[];
}
export class SchoolScheduleDto {
  @IsString()
  @IsIn([
    "ALL",
    "Grade 6",
    "Grade 7",
    "Grade 8",
    "Grade 9",
    "Grade 10",
    "Grade 11",
    "Grade 12",
  ])
  grade!: string;
  @IsOptional() @IsString() @MaxLength(80) stream?: string;
  @IsArray() @ArrayMaxSize(70) blocks!: unknown[];
}
