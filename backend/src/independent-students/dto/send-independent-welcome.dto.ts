import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SendIndependentWelcomeDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  message?: string;
}
