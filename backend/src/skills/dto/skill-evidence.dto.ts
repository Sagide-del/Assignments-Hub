import { IsInt, IsString, MaxLength, Min, MinLength } from "class-validator";
export class SkillEvidenceDto {
  @IsInt() @Min(0) answer: number;
  @IsString() @MinLength(80) @MaxLength(4000) artifact: string;
  @IsString() @MinLength(60) @MaxLength(2000) reflection: string;
}
export class SkillFocusDto {
  @IsString() @MinLength(1) @MaxLength(32) focus: string;
}
