import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
class TitrationTrialDto {
  @IsInt() @Min(1) @Max(20) id: number;
  @IsNumber() @Min(0) @Max(50) initial: number;
  @IsNumber() @Min(0) @Max(50) final: number;
  @IsNumber() @Min(0) @Max(50) dispensed: number;
  @IsBoolean() rough: boolean;
  @IsBoolean() mixed: boolean;
  @IsString() @IsIn(["Colourless", "Pale pink", "Deep pink"]) colour: string;
  @IsString() @MaxLength(5000) notes: string;
}
export class TitrationEvidenceDto {
  @IsIn(["titration-3d-v1"]) version: string;
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(20)
  @ArrayUnique((t: TitrationTrialDto) => t.id)
  @ValidateNested({ each: true })
  @Type(() => TitrationTrialDto)
  trials: TitrationTrialDto[];
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(20, { each: true })
  selected: number[];
  @IsNumber() @Min(0.0001) @Max(1) calculation: number;
  @IsString() @MinLength(30) @MaxLength(5000) conclusion: string;
}
