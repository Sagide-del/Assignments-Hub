import { IsEmail, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { SubscriptionStatus, SchoolType } from '@prisma/client';

export class CreateSchoolDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[A-Z0-9]+$/, {
    message: 'code must be uppercase letters/numbers only, e.g. "GHSCH01"',
  })
  code: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  subscriptionStatus?: SubscriptionStatus;

  // Drives which per-student rate applies in the subscription pricing table
  // (see backend/src/common/config/plans.ts). Defaults to DAY at the schema
  // level; a school admin can change their own school's type any time via
  // PATCH /schools/:id (UpdateSchoolDto derives from this class).
  @IsOptional()
  @IsEnum(SchoolType)
  type?: SchoolType;
}
