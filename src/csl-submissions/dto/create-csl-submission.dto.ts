import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCslSubmissionDto {
  @IsInt()
  cslActivityId: number;

  // URL returned by POST /uploads/single (photo/video/document evidence of
  // the student doing the activity, e.g. a cleanup photo).
  @IsOptional()
  @IsString()
  @MaxLength(500)
  evidenceUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  reflection?: string;
}
