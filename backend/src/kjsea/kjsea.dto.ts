import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsObject,
  IsString,
  Matches,
  MaxLength,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
export class CreateMockDto {
  @IsOptional()
  @IsIn([
    "Grade 6",
    "Grade 7",
    "Grade 8",
    "Grade 9",
    "Grade 10",
    "Grade 11",
    "Grade 12",
  ])
  grade?: string;
  @IsOptional() @IsIn(["GENERATED", "BANK"]) source?: "GENERATED" | "BANK";
  @IsOptional() @IsString() @MaxLength(120) subject?: string;
  @IsOptional() @IsIn([30, 60, 70, 80, 90, 120]) timeLimitMinutes?: number;
}
export class MockAnswerDto {
  @IsString() @Matches(/^q-([1-9]|[1-3][0-9]|40)$/) questionId: string;
  @IsOptional() @IsInt() @Min(0) @Max(3) option?: number;
  @IsOptional() @IsObject() responses?: Record<string, string>;
  @IsOptional() @IsString() @MaxLength(5000) working?: string;
}
export class SaveMockDto {
  @IsArray()
  @ArrayMaxSize(40)
  @ArrayUnique((a: MockAnswerDto) => a.questionId)
  @ValidateNested({ each: true })
  @Type(() => MockAnswerDto)
  answers: MockAnswerDto[];
}
