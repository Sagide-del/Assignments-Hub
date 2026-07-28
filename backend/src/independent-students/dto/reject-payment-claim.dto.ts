import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectIndependentPaymentClaimDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
