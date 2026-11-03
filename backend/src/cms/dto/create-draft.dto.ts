import { Transform } from "class-transformer";
import {
  IsInt,
  IsNotEmptyObject,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class CreateDraftDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  level: string;

  @IsInt()
  @Min(1)
  @Max(12)
  grade: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  pathway?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  track?: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  subject: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  topic: string;

  @IsObject()
  @IsNotEmptyObject()
  content_json: Record<string, unknown>;
}
