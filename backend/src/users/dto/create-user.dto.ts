import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEnum(Role)
  role: Role;

  // Only PLATFORM_ADMIN may set this to create a user outside their own
  // school; SCHOOL_ADMIN requests are always pinned to their own school
  // regardless of what's sent here (see UsersService.create).
  @IsOptional()
  @IsInt()
  schoolId?: number;

  // Required for staff roles (TEACHER, SCHOOL_ADMIN, PLATFORM_ADMIN)
  @ValidateIf((o) => o.role !== Role.STUDENT)
  @IsEmail()
  email?: string;

  @ValidateIf((o) => o.role !== Role.STUDENT)
  @IsString()
  @MinLength(8)
  password?: string;

  // Required for STUDENT
  @ValidateIf((o) => o.role === Role.STUDENT)
  @IsString()
  @MinLength(1)
  admissionNumber?: string;

  // Optional, meaningful only for STUDENT — scopes which assignments they
  // see (see AssignmentsService.findAll). Ignored for staff roles.
  @IsOptional()
  @IsString()
  grade?: string;

  // Parent/guardian phone number, meaningful only for STUDENT — used by
  // SmsService to notify the parent of assignment activity. Expected in
  // international format (e.g. "+254712345678"); SmsService also
  // best-effort normalizes local "07xxxxxxxx" formats.
  @IsOptional()
  @IsString()
  parentPhone?: string;

  @IsOptional()
  @IsString()
  studentClass?: string;

  @IsOptional()
  @IsString()
  stream?: string;

  @IsOptional()
  @IsString()
  pathway?: string;

  @IsOptional()
  @IsString()
  parentName?: string;

  @IsOptional()
  @IsEmail()
  parentEmail?: string;

  // Teacher credential allocation metadata — meaningful only for TEACHER.
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  assignedClass?: string;
}
