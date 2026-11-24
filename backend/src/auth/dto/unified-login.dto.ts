import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UnifiedLoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(254)
  identifier: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  schoolCode?: string;
}
