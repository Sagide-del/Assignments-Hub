import { IsObject } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateAiArtifactDto {
  @ApiProperty({ type: "object", additionalProperties: true })
  @IsObject()
  content: Record<string, unknown>;
}
