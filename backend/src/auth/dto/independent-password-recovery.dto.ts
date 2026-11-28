import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class RequestIndependentPasswordRecoveryDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  identifier: string;
}

export class ConfirmIndependentPasswordRecoveryDto extends RequestIndependentPasswordRecoveryDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: "Enter the six-digit recovery code." })
  code: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
