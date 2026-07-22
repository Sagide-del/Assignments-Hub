import { IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaymentMethod, PaymentStatus, SkillEnrollmentStatus } from '@prisma/client';

export class CreateSkillEnrollmentDto {
  @IsInt()
  courseId: number;
}

export class UpdateSkillEnrollmentDto {
  @IsOptional()
  @IsEnum(SkillEnrollmentStatus)
  status?: SkillEnrollmentStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;
}

export class CreateSkillPaymentDto {
  @IsInt()
  studentId: number;

  @IsInt()
  courseId: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  transactionReference?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}

export class UpdateSkillPaymentDto {
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  transactionReference?: string;
}
