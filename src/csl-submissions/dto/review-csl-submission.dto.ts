import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CslSubmissionStatus } from '@prisma/client';

export class ReviewCslSubmissionDto {
  // PENDING isn't a valid reviewer decision — it's the default state before
  // any review happens, not something a tutor sets. @IsIn (rather than
  // @IsEnum against the full enum) is what actually enforces that at
  // runtime.
  @IsIn([CslSubmissionStatus.APPROVED, CslSubmissionStatus.NEEDS_REVISION], {
    message: 'status must be APPROVED or NEEDS_REVISION',
  })
  status: 'APPROVED' | 'NEEDS_REVISION';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  score?: number;

  // Defaults to 100 in the service layer if score is given but this isn't.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  maxScore?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}
