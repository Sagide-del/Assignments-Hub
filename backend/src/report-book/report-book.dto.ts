import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
  ValidateIf,
} from "class-validator";
export class PeriodDto {
  @IsUUID() stream_id!: string;
  @IsIn(["Term 1", "Term 2", "Term 3"]) term!: string;
  @IsInt() @Min(2020) @Max(2100) year!: number;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  subjects!: string[];
}
export class ClassTeacherDto {
  @IsUUID() stream_id!: string;
  @IsInt() @Min(1) teacher_id!: number;
}
export class BandDto {
  @IsNumber() @Min(0) @Max(100) min!: number;
  @IsString() @MaxLength(12) code!: string;
  @IsString() @MaxLength(60) label!: string;
}
export class PolicyDto {
  @IsInt() @Min(1) @Max(12) grade_level!: number;
  @IsBoolean() confirmed!: boolean;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => BandDto)
  bands!: BandDto[];
}
export class ScoreDto {
  @IsOptional() @IsDateString() expected_updated_at?: string;
  @IsInt() @Min(1) student_id!: number;
  @ValidateIf((_o, v) => v !== null) @IsNumber() @Min(0) score!: number | null;
  @IsOptional() @IsString() @MaxLength(500) remark?: string;
}
export class BulkSaveDto {
  @IsUUID() period_id!: string;
  @IsString() @MaxLength(100) subject!: string;
  @IsString() @MaxLength(120) assessment_name!: string;
  @IsNumber() @Min(1) @Max(10000) max_score!: number;
  @IsNumber() @Min(0.01) @Max(100) weight!: number;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ScoreDto)
  scores!: ScoreDto[];
}
export class GenerateDto {
  @IsOptional() @IsBoolean() rank?: boolean;
}
export class ReportCommentDto {
  @IsOptional() @IsString() @MaxLength(1000) teacher_comment?: string;
  @IsOptional() @IsString() @MaxLength(1000) principal_comment?: string;
}
export class ReopenDto {
  @IsString() @MaxLength(500) reason!: string;
}
export class AiCommentsDto {
  @IsUUID() assessment_id!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(40)
  @IsUUID(undefined, { each: true })
  record_ids!: string[];
}

export class PeriodSubjectsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  subjects!: string[];
}

export class ReportBookSettingsDto {
  @IsOptional() @IsString() @MaxLength(500) logoUrl?: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(254) contactEmail?: string;
  @IsOptional() @IsString() @MaxLength(160) principal_name?: string;
  @IsOptional() @IsString() @MaxLength(500) principal_signature_url?: string;
  @IsOptional() @IsDateString() school_closes_on?: string;
  @IsOptional() @IsString() @MaxLength(12) school_closes_time?: string;
  @IsOptional() @IsDateString() school_opens_on?: string;
  @IsOptional() @IsString() @MaxLength(12) school_opens_time?: string;
}
