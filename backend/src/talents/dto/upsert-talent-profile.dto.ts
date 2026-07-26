import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

// STUDENT-submitted "My Talents & Strengths" profile. A plain evolving
// record (see schema.prisma's comment on StudentTalentProfile) rather than
// a fixed vocabulary — students describe their own talents/strengths in
// their own words, same free-text-tag shape as Track.interestTags /
// StudentSupportAssessment.interests elsewhere in this codebase.
export class UpsertTalentProfileDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  talents?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  strengths?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reflection?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  growthPlan?: string;
}
