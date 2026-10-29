import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";
import { BulkApproveQuestionBankDto } from "./bulk-approve-question-bank.dto";
export class PublishContentDto extends BulkApproveQuestionBankDto {
  @IsIn(["INDEPENDENT", "SCHOOLS", "BOTH"]) audience:
    "INDEPENDENT" | "SCHOOLS" | "BOTH";
  @IsOptional() @IsIn(["ALL", "SELECTED"]) schoolScope?: "ALL" | "SELECTED";
  @ValidateIf((o) => o.schoolScope === "SELECTED" || o.schoolIds !== undefined)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  schoolIds?: number[];
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160) title?: string;
}
