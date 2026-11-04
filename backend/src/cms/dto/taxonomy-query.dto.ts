import { Type } from "class-transformer";
import { IsInt, Max, Min } from "class-validator";
export class TaxonomyQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  grade: number;
}
