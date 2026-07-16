import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class BroadcastSmsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(480) // ~3 SMS segments (160 chars each) — keeps cost/length sane
  message: string;

  // Restrict the broadcast to one grade (e.g. "Grade 7"). Omit to send to
  // every active student's parent in the school.
  @IsOptional()
  @IsString()
  grade?: string;
}
