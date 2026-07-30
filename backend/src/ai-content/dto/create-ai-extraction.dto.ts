import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateAiExtractionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  subject: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  grade?: string;
}
