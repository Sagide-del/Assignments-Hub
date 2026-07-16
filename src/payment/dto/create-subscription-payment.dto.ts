import { IsEmail, IsIn, IsInt, IsOptional } from 'class-validator';

// Same no-client-plan/amount rule as CreatePaymentDto — see that file's
// comment. `interval` is purely a label for how long the checkout is framed
// as covering (encoded into api_ref for future recurring-billing use); it
// does not change the amount charged, which is always one month's price.
export class CreateSubscriptionPaymentDto {
  @IsInt()
  schoolId: number;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsIn(['monthly', 'annual'])
  interval?: string;
}
