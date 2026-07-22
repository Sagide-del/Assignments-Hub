import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { SkillContentStatus, SkillLevel } from '@prisma/client';

export class CreateSkillCourseDto {
  @IsInt()
  categoryId: number;

  @IsInt()
  providerId: number;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title: string;

  @IsString()
  @MinLength(2)
  @MaxLength(280)
  shortDescription: string;

  @IsString()
  @MinLength(2)
  @MaxLength(5000)
  fullDescription: string;

  @IsInt()
  @Min(1)
  @Max(104)
  durationWeeks: number;

  @IsEnum(SkillLevel)
  level: SkillLevel;

  @IsInt()
  @Min(0)
  @Max(1000000)
  costKES: number;

  @IsOptional()
  @IsBoolean()
  certificateAvailable?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  thumbnailUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  learningOutcomes?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  courseStructure?: string[];

  @IsOptional()
  @IsEnum(SkillContentStatus)
  status?: SkillContentStatus;
}
