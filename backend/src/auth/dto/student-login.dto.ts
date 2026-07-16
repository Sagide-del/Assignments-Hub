import { IsNotEmpty, IsString } from 'class-validator';

/** Login for students: school code + admission number (no password). */
export class StudentLoginDto {
  @IsString()
  @IsNotEmpty()
  schoolCode: string;

  @IsString()
  @IsNotEmpty()
  admissionNumber: string;
}
