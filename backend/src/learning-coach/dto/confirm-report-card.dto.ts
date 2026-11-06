import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

export class ReportCardScoreDto {
  @IsString()
  subject!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage!: number;
}

export class ConfirmReportCardDto {
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ReportCardScoreDto)
  scores!: ReportCardScoreDto[];
}
