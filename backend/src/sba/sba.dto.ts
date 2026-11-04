import { Type, Transform } from "class-transformer";
import {
  IsIn,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from "class-validator";
export class RecordSbaDto {
  @Type(() => Number) @IsInt() @Min(1) student_id!: number;
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Length(1, 120)
  subject!: string;
  @Type(() => Number) @IsIn([10, 11]) grade_level!: number;
  @IsIn(["Term 1", "Term 2", "Term 3"]) term!: string;
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  score!: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  academic_year?: number;
}
export class SbaFiltersDto {
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  csl_below50?: boolean;
  @IsOptional() @IsIn(["Grade 10", "Grade 11", "Grade 12"]) grade?: string;
  @IsOptional() @IsString() @Length(1, 40) stream?: string;
  @IsOptional() @IsString() @Length(1, 120) pathway?: string;
  @IsOptional() @IsString() @Length(1, 120) track?: string;
}
