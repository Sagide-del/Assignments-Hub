import { IsObject } from "class-validator";

export class UpdateAiArtifactDto {
  @IsObject()
  content: Record<string, unknown>;
}
