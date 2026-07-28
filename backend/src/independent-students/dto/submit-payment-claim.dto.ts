import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitIndependentPaymentClaimDto {
  @IsString()
  @MinLength(1)
  identifier: string;

  @IsIn(['monthly', 'annual', 'MONTHLY', 'ANNUAL'])
  interval: string;

  @IsString()
  @MinLength(5)
  @MaxLength(100)
  mpesaCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  payerPhone?: string;
}
