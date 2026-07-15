import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';

const INSTITUTION_TYPES = ['ASSESSMENT_CENTER', 'SPECIAL_SCHOOL', 'INCLUSIVE_MAINSTREAM', 'VOCATIONAL_TRAINING', 'SUPPORT_ORGANIZATION'];
const DISABILITY_CATEGORIES = [
  'VISUAL_IMPAIRMENT',
  'HEARING_IMPAIRMENT',
  'PHYSICAL_DISABILITY',
  'INTELLECTUAL_DEVELOPMENTAL',
  'AUTISM_SPECTRUM',
  'MULTIPLE_DEAFBLIND',
  'OTHER_UNSURE',
];

// Admin-only catalog management (PLATFORM_ADMIN) — day-to-day content is
// expected to go through prisma/seed-support-institutions-data.ts + rerun
// seed, same as Track. This DTO exists for the rare one-off tweak (fixing a
// phone number, adding a newly-found institution) without a full redeploy.
export class CreateSupportInstitutionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/^[a-z0-9-]+$/, { message: 'key must be lowercase letters, numbers and hyphens only' })
  key: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsIn(INSTITUTION_TYPES)
  type: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsIn(DISABILITY_CATEGORIES, { each: true })
  categories: string[];

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  county: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  town?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  boardingType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  ageRange?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  description: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  servicesOffered?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourceNote?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
