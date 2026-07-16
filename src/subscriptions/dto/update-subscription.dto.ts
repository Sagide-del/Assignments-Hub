import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { SubscriptionStatus } from '@prisma/client';

// plan/schoolId are immutable after creation — start a new subscription
// record instead of mutating history in place.
export class UpdateSubscriptionDto {
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
