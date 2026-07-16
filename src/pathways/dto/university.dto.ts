import { ArrayMaxSize, IsArray, IsString, MaxLength, MinLength } from 'class-validator';

export class UniversityKenyaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name: string;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  programs: string[];
}

export class UniversityIntlDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  country: string;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  programs: string[];
}
