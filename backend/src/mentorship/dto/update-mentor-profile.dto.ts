import { IsArray, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

// TEACHER-submitted, self-service listing. Every TEACHER at a school
// already appears in the mentor directory by default (see
// MentorshipService.findMentorDirectory) — this just lets a teacher add a
// bio/expertise or opt out (isAvailable: false).
export class UpdateMentorProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  expertiseAreas?: string[];

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
