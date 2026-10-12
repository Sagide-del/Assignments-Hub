import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ImportAcademicResultsDto {
  @IsString()
  @MaxLength(160)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  academicYear!: number;

  @IsString()
  @MaxLength(40)
  term!: string;

  @IsString()
  @MaxLength(50)
  grade!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  className?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  stream?: string;
}
