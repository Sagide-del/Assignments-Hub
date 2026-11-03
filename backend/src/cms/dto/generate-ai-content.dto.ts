import { OmitType } from "@nestjs/mapped-types";
import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { CreateDraftDto } from "./create-draft.dto";

// Generated content and usage totals are supplied by the provider, never the caller.
export class GenerateAiContentDto extends OmitType(CreateDraftDto, [
  "level",
  "content_json",
] as const) {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  level?: string;
}
