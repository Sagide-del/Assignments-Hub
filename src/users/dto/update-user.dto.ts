import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

// Role, schoolId, email, and admissionNumber are immutable via this endpoint
// to avoid accidentally moving a user between tenants or credential types.
// Deactivation is the supported way to revoke access.
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsString()
  parentPhone?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  assignedClass?: string;
}
