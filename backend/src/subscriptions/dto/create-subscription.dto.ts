import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { SubscriptionStatus } from '@prisma/client';

export class CreateSubscriptionDto {
  @IsInt()
  schoolId: number;

  // Normally one of the auto-resolved tier names (Free/Starter/Standard/
  // Premium/Enterprise — see PaymentService), but kept as free text here so
  // a platform admin can grant/correct a plan manually (e.g. after
  // confirming an off-platform payment) without a schema change every time
  // the tier catalog changes.
  @IsString()
  @MinLength(1)
  plan: string;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  // Optional — lets a platform admin record what was actually charged for a
  // manually-created subscription (e.g. an off-platform M-Pesa payment) so
  // it's still counted in ReportsService.financialReport's revenue total.
  // Subscriptions created automatically via PaymentService always set this.
  @IsOptional()
  @IsInt()
  @Min(0)
  amountKES?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
