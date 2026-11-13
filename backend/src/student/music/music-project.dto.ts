import { Type, Transform } from "class-transformer";
import {
  IsString,
  IsInt,
  IsIn,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from "class-validator";
import { LOOP_IDS, LoopId, Meter } from "./project";
class TrackDto {
  @IsInt() @Min(1) @Max(4) id: number;
  @IsString() @MinLength(1) @MaxLength(40) name: string;
  @IsOptional() @IsIn(LOOP_IDS) loop_id: LoopId | null;
  @IsNumber() @Min(0) @Max(1) volume: number;
  @IsBoolean() muted: boolean;
  @IsBoolean() solo: boolean;
}
export class MusicProjectDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;
  @IsInt() @Min(60) @Max(180) bpm: number;
  @IsIn(["4/4", "6/8", "12/8"]) time_signature: Meter;
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => TrackDto)
  tracks_json: TrackDto[];
}
