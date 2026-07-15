import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateCslActivityDto {
  // Slug-like identifier, e.g. "grade7-environmental-cleaning".
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'key must be lowercase letters, numbers and hyphens only, e.g. "grade7-environmental-cleaning"',
  })
  key: string;

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  // Student grade/class this activity targets, e.g. "Grade 7" — matches
  // User.grade/Lab.grade. Students only see activities for their own grade
  // (see CslActivitiesService.findAll).
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  grade: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  competency?: string;

  // Defaults to true — most CSL activities are compulsory. A student's
  // report card flags any required activity with no APPROVED submission as
  // outstanding (see ReportsService.studentReportCard).
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  targetHours?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
