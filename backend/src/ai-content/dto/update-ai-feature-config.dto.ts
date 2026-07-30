import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  Max,
  Min,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateAiFeatureConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  previewOnly?: boolean;

  @ApiPropertyOptional({ minimum: 1, maximum: 100_000, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  monthlyRequestLimit?: number;

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>;
}
