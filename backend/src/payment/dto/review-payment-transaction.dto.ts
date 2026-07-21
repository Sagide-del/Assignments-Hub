import { IsOptional, IsString } from 'class-validator';

export class ReviewPaymentTransactionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
