import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateIndependentStudentDto {
  @IsString()
  @MinLength(2)
  name: string;

  // Optional — auto-generated (IndependentStudentsService) if omitted,
  // since independent students don't come from a school register.
  @IsOptional()
  @IsString()
  admissionNumber?: string;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsString()
  parentPhone?: string;
}
