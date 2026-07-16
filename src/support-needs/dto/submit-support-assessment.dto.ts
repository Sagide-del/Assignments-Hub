import { IsArray, IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

// STUDENT-submitted intake for the Inclusive/Special Needs Education
// support tool. Deliberately shaped like a short, respectful questionnaire
// rather than a clinical form — see SupportNeedsService's doc comment for
// why this is guidance, not a diagnosis.
//
// String literals (rather than importing the Prisma-generated enum) match
// the pattern already used by SelectTrackDto.source in the pathways
// module — keeps this DTO independent of whether `prisma generate` has
// been re-run yet.
export class SubmitSupportAssessmentDto {
  @IsIn([
    'VISUAL_IMPAIRMENT',
    'HEARING_IMPAIRMENT',
    'PHYSICAL_DISABILITY',
    'INTELLECTUAL_DEVELOPMENTAL',
    'AUTISM_SPECTRUM',
    'MULTIPLE_DEAFBLIND',
    'OTHER_UNSURE',
  ])
  category: string;

  @IsIn(['MILD_SOME_SUPPORT', 'MODERATE_REGULAR_SUPPORT', 'SIGNIFICANT_INTENSIVE_SUPPORT'])
  supportLevel: string;

  @IsBoolean()
  hasFormalAssessment: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  currentChallenges?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
