import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewResourcePurchaseDto {
  @IsBoolean()
  approved!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
