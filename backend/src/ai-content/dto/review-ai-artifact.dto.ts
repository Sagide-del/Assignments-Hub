import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class ApproveAiArtifactDto {
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  notes?: string;
}

export class RejectAiArtifactDto {
  @IsString()
  @MinLength(2)
  @MaxLength(2_000)
  notes: string;
}
