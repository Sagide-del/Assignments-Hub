import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class ManualAcademicResultDto {
  @IsString()
  @MaxLength(80)
  subject!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  score!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(100000)
  maxScore!: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  gradeLabel?: string;
}

/**
 * A learner confirms the marks shown on a report when a school has not
 * imported results or a scanned report cannot be read reliably.
 */
export class RecordOwnAcademicResultsDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  assessmentName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  academicYear?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  term?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ManualAcademicResultDto)
  results!: ManualAcademicResultDto[];
}
