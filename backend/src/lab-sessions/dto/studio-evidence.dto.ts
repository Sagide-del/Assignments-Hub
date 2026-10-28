import type { RespiratoryEvent } from "../../labs/respiratory-engine";
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
import type { CyberEvent, PendulumEvent } from "../../labs/studio-engine";
export class StudioEvidenceDto {
  @IsIn(["cyber-studio-v1", "pendulum-studio-v1", "respiratory-studio-v1"])
  version: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsObject({ each: true })
  events: (CyberEvent | PendulumEvent | RespiratoryEvent)[];
  @IsString() @MinLength(30) @MaxLength(5000) conclusion: string;
}
