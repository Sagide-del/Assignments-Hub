import { BLOG_LANDING_SOURCES } from "../../analytics/landing-source";
import { Transform } from "class-transformer";
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from "class-validator";

export class RegisterIndependentStudentDto {
  @IsOptional()
  @IsIn(BLOG_LANDING_SOURCES)
  landing_source?: string;

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

  // Senior School learners can start with a nationally available pathway.
  // It remains optional so existing clients and Junior/Primary registration
  // keep working unchanged.
  @IsOptional()
  @IsString()
  @MaxLength(80)
  pathway?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  parentPhone?: string;

}
