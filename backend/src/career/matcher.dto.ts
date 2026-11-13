import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
export class JuniorScoreDto {
  @IsString() @MinLength(2) @MaxLength(100) subject!: string;
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100)
  percentage!: number;
}
export class MatchCombinationsDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => JuniorScoreDto)
  scores?: JuniorScoreDto[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  interests?: string[];
  @IsOptional() @IsString() @MaxLength(120) desired_career?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(100) target_score?: number;
}
export class CombinationRowDto {
  @Matches(/^[A-Z]{2,4}\d{3,6}$/) code!: string;
  @IsString() @MinLength(2) @MaxLength(100) pathway!: string;
  @IsString() @MinLength(2) @MaxLength(120) track!: string;
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(2, { each: true })
  @MaxLength(100, { each: true })
  subjects!: string[];
}
export class ImportCombinationsDto {
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(500)
  source_url!: string;
  @IsBoolean() reviewed!: boolean;
  @IsOptional() @IsBoolean() dry_run?: boolean;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => CombinationRowDto)
  combinations!: CombinationRowDto[];
}
export class SaveCombinationDto {
  @IsOptional() @IsUUID("4") combination_id?: string;
  @IsOptional() @IsInt() @Min(1) track_id?: number;
}
