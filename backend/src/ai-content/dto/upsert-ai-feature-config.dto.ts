import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  Max,
  Min,
} from "class-validator";

export class UpsertAiFeatureConfigDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsBoolean()
  previewOnly?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  monthlyRequestLimit?: number;

  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>;
}
