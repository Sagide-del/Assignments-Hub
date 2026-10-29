import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  Equals,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { CONTENT_GRADES } from "./official-curriculum";
export class CreateCollectionDto {
  @IsString() @MaxLength(160) name: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsIn(CONTENT_GRADES, { each: true })
  grades: string[];
  @Equals(true) rightsConfirmed: true;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  urls?: string[];
}
export class AssetReviewDto {
  @IsOptional() @IsBoolean() sourceLimitationsReviewed?: boolean;
  @IsOptional()
  @IsIn(["AUTO", "CURRICULUM", "TEACHING", "FRAMEWORK"])
  role?: string;
  @IsOptional() mapping?: unknown;
}
export class AssetIdsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  ids: string[];
}
export class CatalogueDto {
  @IsString() @MaxLength(80000) rows: string;
  @IsString() @MaxLength(1000) authority: string;
}
export class VerifyGradesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsIn(CONTENT_GRADES, { each: true })
  grades: string[];
  @Equals(true) reviewed: true;
}
export class OutcomeReviewDto {
  @IsString() @MaxLength(160) strand: string;
  @IsString() @MaxLength(160) subStrand: string;
  @IsString() @MaxLength(1200) outcome: string;
  @IsString() @MaxLength(2000) quote: string;
  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique()
  @IsInt({ each: true })
  supportingSourceIds: number[];
  @IsBoolean() verified: boolean;
}
export class OutcomeGenerationDto {
  @IsOptional() @IsIn(["PRACTICE", "WRITTEN"]) assessmentMode?:
    "PRACTICE" | "WRITTEN";
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsInt({ each: true })
  unitIds: number[];
  @IsIn(["QUESTIONS", "CARDS", "BOTH"]) kind: "QUESTIONS" | "CARDS" | "BOTH";
  @IsInt() @Min(5) @Max(30) count: number;
}

export class ExistingSourcesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsInt({ each: true })
  sourceIds: number[];
}

export class UploadCollectionFileDto {
  @IsOptional() @IsString() @MaxLength(500) relativePath?: string;
}
