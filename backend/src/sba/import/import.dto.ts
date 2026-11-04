import { Type, Transform } from "class-transformer";
import { IsInt, IsString, Length, Max, Min } from "class-validator";
export class ImportMocksDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Length(1, 120)
  source!: string;
  @Type(() => Number) @IsInt() @Min(2000) @Max(2100) academic_year!: number;
}
