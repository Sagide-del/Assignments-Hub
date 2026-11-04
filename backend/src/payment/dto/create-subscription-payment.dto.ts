import { IsEmail, IsIn, IsInt, IsOptional } from 'class-validator';

// New school checkout accepts annual billing only. Amount is computed from
// the live learner count at KES 200/learner/year, never supplied by the client.
export class CreateSubscriptionPaymentDto {
  @IsInt()
  schoolId: number;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsIn(['annual'])
  interval?: string;
}
