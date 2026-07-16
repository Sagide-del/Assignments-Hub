import { IsString, MaxLength, MinLength } from 'class-validator';

export class SubjectRequirementDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  subject: string;

  @IsString()
  @MinLength(1)
  @MaxLength(3)
  minGrade: string;
}
