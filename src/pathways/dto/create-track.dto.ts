import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SubjectRequirementDto } from './subject-requirement.dto';
import { CareerDto } from './career.dto';
import { UniversityKenyaDto, UniversityIntlDto } from './university.dto';

// Admin-only catalog management (PLATFORM_ADMIN) — day-to-day content
// changes are expected to go through prisma/seed-pathways-data.ts + rerun
// seed, same as Lab/CslActivity. This DTO exists for the rare one-off tweak
// (fixing a salary band, adding a career) without a full redeploy.
export class CreateTrackDto {
  @IsInt()
  pathwayId: number;

  // Slug-like identifier, unique within its pathway, e.g. "pure-sciences".
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'key must be lowercase letters, numbers and hyphens only, e.g. "pure-sciences"',
  })
  key: string;

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  description: string;

  // Font Awesome icon class, e.g. "fa-flask-vial".
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  icon: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SubjectRequirementDto)
  requiredSubjects: SubjectRequirementDto[];

  @IsOptional()
  @IsString()
  @MaxLength(3)
  minMeanGrade?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  interestTags?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CareerDto)
  careers: CareerDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  skills: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  jobOutlook?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobGrowthRate?: string;

  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => UniversityKenyaDto)
  universitiesKenya: UniversityKenyaDto[];

  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => UniversityIntlDto)
  universitiesIntl: UniversityIntlDto[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  degreeDurationYears?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  nextSteps?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  extracurriculars?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  certifications?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  workExperience?: string[];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
