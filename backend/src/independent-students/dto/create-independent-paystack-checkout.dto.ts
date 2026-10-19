import { IsIn, IsOptional } from 'class-validator';

export class CreateIndependentPaystackCheckoutDto {
  @IsOptional()
  @IsIn(['monthly', 'annual', 'MONTHLY', 'ANNUAL'])
  interval?: string;
}
