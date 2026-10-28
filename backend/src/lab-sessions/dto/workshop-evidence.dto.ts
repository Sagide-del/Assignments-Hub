import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsObject,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import type { PracticalEvent } from "../../labs/practical-engine";
export class WorkshopEvidenceDto {
  @IsIn(["stem-workshop-v2"]) version: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(300)
  @IsObject({ each: true })
  events: PracticalEvent[];
  @IsString() @MinLength(30) @MaxLength(5000) conclusion: string;
}
