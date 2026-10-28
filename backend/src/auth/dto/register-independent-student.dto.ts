import { Transform } from "class-transformer";
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from "class-validator";

export class RegisterIndependentStudentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  // Optional for older clients; the current registration form requires it.
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @Matches(/^[a-z][a-z0-9._]{2,29}$/, {
    message:
      "Choose a username of 3–30 characters, starting with a letter. Use letters, numbers, dots or underscores.",
  })
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  grade: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  parentPhone?: string;
}
