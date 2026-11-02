import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class GenerateSkillDraftDto {
  @IsString()
  @MaxLength(120)
  topic: string;

  @IsIn(['Grade 4-6', 'Grade 7-9', 'Grade 10-12'])
  gradeBand: 'Grade 4-6' | 'Grade 7-9' | 'Grade 10-12';

  @IsOptional()
  @IsIn(['STEM', 'SOCIAL_SCIENCES', 'ARTS_AND_SPORTS'])
  pathway?: 'STEM' | 'SOCIAL_SCIENCES' | 'ARTS_AND_SPORTS';
}
