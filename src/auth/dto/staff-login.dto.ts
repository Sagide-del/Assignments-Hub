import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

/** Login for Teacher / School Admin / Platform Admin accounts. */
export class StaffLoginDto {
  @IsString()
  @IsNotEmpty()
  schoolCode: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}
