import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateLabReflectionPromptDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  prompt: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
