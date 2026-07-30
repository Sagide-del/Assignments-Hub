import { IsBoolean, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class PublishAiArtifactDto {
  @ApiPropertyOptional({
    default: false,
    description:
      "When false, creates an assignment draft. When true, explicitly publishes it to students.",
  })
  @IsOptional()
  @IsBoolean()
  publishNow?: boolean;
}
