import { BLOG_LANDING_SOURCES } from "../../analytics/landing-source";
import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

export class StartIntasendPaymentDto {
  @IsOptional()
  @IsIn(BLOG_LANDING_SOURCES)
  landing_source?: string;
  @IsIn(["MONTHLY", "ANNUAL"])
  interval: "MONTHLY" | "ANNUAL";

  @IsString()
  @MaxLength(30)
  @Matches(/^[+\d\s()-]+$/)
  phone: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9-]{16,80}$/)
  idempotencyKey: string;
}
