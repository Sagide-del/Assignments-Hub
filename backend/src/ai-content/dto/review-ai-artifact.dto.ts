import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ApproveAiArtifactDto {
  @ApiPropertyOptional({ maxLength: 2_000 })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  notes?: string;
}

export class RejectAiArtifactDto {
  @ApiProperty({ minLength: 2, maxLength: 2_000 })
  @IsString()
  @MinLength(2)
  @MaxLength(2_000)
  notes: string;
}
