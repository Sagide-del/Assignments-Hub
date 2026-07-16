import { IsEmail, IsInt } from 'class-validator';

// Deliberately has no `plan` or `amount` field: the tier and amount charged
// are always computed server-side from the school's live student count and
// type (see PaymentService.computePricingForSchool), so a client can never
// request a checkout for a plan/price it doesn't actually qualify for.
export class CreatePaymentDto {
  @IsInt()
  schoolId: number;

  @IsEmail()
  email: string;
}
