import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class SelectTrackDto {
  @IsInt()
  trackId: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  // Set to 'RECOMMENDATION' when the student accepted the recommendation
  // engine's top suggestion directly, rather than browsing and picking a
  // track themselves — purely informational, shown on the report/teacher
  // view so a tutor can tell how a student arrived at their choice.
  @IsOptional()
  @IsIn(['MANUAL', 'RECOMMENDATION'])
  source?: 'MANUAL' | 'RECOMMENDATION';
}
