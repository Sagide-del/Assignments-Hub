import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class RecordIndependentInvoiceDto {
  @IsInt()
  @Min(1)
  studentId: number;

  // Overrides the invoice's studentName snapshot (defaults to the
  // student's current name) — rarely needed, e.g. correcting a typo.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  studentName?: string;

  @IsInt()
  @Min(1)
  amountKES: number;

  @IsOptional()
  @IsIn(['monthly', 'annual'])
  interval?: string;

  // The M-Pesa Till Number payment's confirmation code — the actual proof
  // of payment the admin verified before recording this invoice.
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  mpesaCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  payerPhone?: string;
}
