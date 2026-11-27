import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsString,
  ArrayMaxSize,
  IsInt,
  MaxLength,
  IsOptional,
  Max,
  Min,
} from "class-validator";

export class CompleteLessonDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  answers?: string[];
  @ApiPropertyOptional({
    description:
      "Legacy input; ignored. Send first answers for server-calculated formative scores.",
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;
}
