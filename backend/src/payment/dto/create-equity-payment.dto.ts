import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateEquityPaymentDto {
  @IsOptional()
  @IsInt()
  schoolId?: number;

  @IsString()
  paymentReference: string;

  @IsString()
  payerName: string;

  @IsString()
  payerPhone: string;

  @IsOptional()
  @IsIn(['annual'])
  interval?: string;
}
