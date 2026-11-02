import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSbaEvidenceDto {
  @IsString()
  @MaxLength(120)
  subject: string;

  @IsString()
  @MaxLength(180)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string;
}
