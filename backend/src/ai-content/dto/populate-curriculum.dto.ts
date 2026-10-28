import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  Equals,
  IsArray,
  IsInt,
  IsString,
  Max,
  Min,
} from "class-validator";
export class PopulateCurriculumDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  unitIds: string[];
  @IsInt() @Min(5) @Max(20) questionCount: number;
  @Equals(true) structureReviewed: boolean;
}
export class PublishCurriculumDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsInt({ each: true })
  artifactIds: number[];
  @Equals(true) reviewed: boolean;
}
