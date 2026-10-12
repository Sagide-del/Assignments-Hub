import { PaymentMethod } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class PurchaseResourceDto {
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ValidateIf((value: PurchaseResourceDto) => value.paymentMethod != null)
  @IsString()
  @MaxLength(120)
  paymentReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  payerPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  deliveryName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  deliveryPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryAddress?: string;
}
