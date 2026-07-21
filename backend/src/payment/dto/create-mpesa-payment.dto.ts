import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateMpesaPaymentDto {
  @IsOptional()
  @IsInt()
  schoolId?: number;

  @IsString()
  payerName: string;

  @IsString()
  payerPhone: string;

  @IsOptional()
  @IsIn(['monthly', 'annual'])
  interval?: string;
}
