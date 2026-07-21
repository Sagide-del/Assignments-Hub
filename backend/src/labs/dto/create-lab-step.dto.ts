import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateLabStepDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  instruction: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  interactionType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  expectedOutcome?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
