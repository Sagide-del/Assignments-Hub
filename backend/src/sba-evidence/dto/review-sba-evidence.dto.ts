import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewSbaEvidenceDto {
  @IsIn(['VERIFIED', 'NEEDS_REVISION'])
  status: 'VERIFIED' | 'NEEDS_REVISION';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}
