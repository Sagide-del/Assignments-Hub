import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { AiJobStatus } from "@prisma/client";

export class ListAiGenerationsDto {
  @ApiPropertyOptional({ enum: AiJobStatus })
  @IsOptional()
  @IsEnum(AiJobStatus)
  status?: AiJobStatus;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  schoolId?: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}
