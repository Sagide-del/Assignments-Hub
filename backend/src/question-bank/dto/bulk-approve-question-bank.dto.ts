import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsObject,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";

export class QuestionApprovalFiltersDto {
  @IsOptional() @IsInt() @Min(1) batchId?: number;
  @IsOptional() @IsString() @MaxLength(50) grade?: string;
  @IsOptional() @IsString() @MaxLength(120) subject?: string;
  @IsOptional() @IsString() @MaxLength(160) topic?: string;
}
export class BulkApproveQuestionBankDto {
  @IsIn(["IDS", "FILTER"]) scope: "IDS" | "FILTER";
  @ValidateIf((o) => o.scope === "IDS" || o.ids !== undefined)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  ids?: number[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5000)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  excludedIds?: number[];
  @ValidateIf((o) => o.scope === "FILTER" || o.filters !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => QuestionApprovalFiltersDto)
  filters?: QuestionApprovalFiltersDto;
  @ValidateIf((o) => o.scope === "FILTER" || o.before !== undefined)
  @IsDateString()
  before?: string;
}
