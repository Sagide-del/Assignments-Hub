import {
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { Transform } from "class-transformer";
import { METERS, ProductionMeter, ProductionMix } from "./model";
export class ProductionDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;
  @IsOptional() @IsUUID() song_id?: string | null;
  @IsInt() @Min(60) @Max(180) bpm: number;
  @IsIn(METERS) time_signature: ProductionMeter;
  @IsObject() tracks_json: ProductionMix;
}
export class MusicReviewDto {
  @IsNumber() @Min(0) @Max(100) score: number;
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  comment: string;
}
