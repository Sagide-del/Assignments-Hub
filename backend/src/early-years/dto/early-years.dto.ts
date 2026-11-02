import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';

export const EARLY_YEARS_GRADES = ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3'] as const;
export const EARLY_YEARS_AREAS = ['language', 'maths', 'world', 'creative', 'movement', 'values'] as const;

export class GenerateEarlyYearsDto {
  @IsIn([...EARLY_YEARS_GRADES]) grade: (typeof EARLY_YEARS_GRADES)[number];
  @IsIn([...EARLY_YEARS_AREAS]) area: (typeof EARLY_YEARS_AREAS)[number];
  @IsIn(['EN', 'SW']) language: 'EN' | 'SW' = 'EN';
  @IsInt() @Min(1) @Max(10) count = 3;
  @IsIn(['INDEPENDENT', 'SCHOOLS', 'BOTH']) audience: 'INDEPENDENT' | 'SCHOOLS' | 'BOTH' = 'BOTH';
  @IsOptional() @IsIn(['ALL', 'SELECTED']) schoolScope?: 'ALL' | 'SELECTED';
  @ValidateIf((dto) => dto.schoolScope === 'SELECTED') @IsArray() @ArrayUnique() @ArrayMaxSize(100) @IsInt({ each: true }) schoolIds?: number[];
}

export class PublishEarlyYearsDto {
  @IsIn(['DRAFT', 'PUBLISHED']) status: 'DRAFT' | 'PUBLISHED';
}

export class CompleteEarlyYearsDto {
  @IsString() @MaxLength(80) activityId: string;
}
