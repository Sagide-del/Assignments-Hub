import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type, Transform } from "class-transformer";
export class LibraryGenerationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsInt({ each: true })
  sourceIds: number[];
  @IsIn(["QUESTIONS", "CARDS", "BOTH"]) kind: "QUESTIONS" | "CARDS" | "BOTH";
  @IsInt() @Min(5) @Max(100) count: number = 30;
  @IsOptional() @IsString() @MaxLength(160) topic?: string;
}
export class ImportSourceDto {
  @IsString() @MaxLength(2000) url: string;
  @IsString() @MaxLength(120) subject: string;
  @IsIn([
    "Grade 6",
    "Grade 7",
    "Grade 8",
    "Grade 9",
    "Grade 10",
    "Grade 11",
    "Grade 12",
  ])
  grade: string;
}
export class ImportSourcesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ImportSourceDto)
  sources: ImportSourceDto[];
}
export class RecallUpdateDto {
  @IsString() @MaxLength(200) title: string;
  @IsOptional() content?: unknown;
}

export class DiscoverCurriculumDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsIn(
    [
      "Grade 6",
      "Grade 7",
      "Grade 8",
      "Grade 9",
      "Grade 10",
      "Grade 11",
      "Grade 12",
    ],
    { each: true },
  )
  grades?: string[];
}
