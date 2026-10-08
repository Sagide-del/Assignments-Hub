import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

/**
 * School learner login. PIN is optional only for legacy accounts that have
 * not yet been migrated; every newly imported learner receives one.
 */
export class StudentLoginDto {
  @IsString()
  @IsNotEmpty()
  schoolCode: string;

  @IsString()
  @IsNotEmpty()
  admissionNumber: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4,8}$/, { message: 'PIN must contain 4 to 8 digits' })
  pin?: string;
}
