import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class StartLearningSessionDto {
  @IsString()
  @MaxLength(100)
  subject!: string;

  @IsString()
  @MaxLength(160)
  topic!: string;

  @IsOptional()
  @IsIn(['DIAGNOSTIC', 'PRACTICE'])
  mode?: 'DIAGNOSTIC' | 'PRACTICE';
}
