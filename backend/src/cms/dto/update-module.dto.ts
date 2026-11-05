import { Transform } from "class-transformer";
import { IsString, MinLength, MaxLength } from "class-validator";
export class UpdateModuleDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  topic: string;
}
