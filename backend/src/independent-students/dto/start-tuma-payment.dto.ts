import { IsIn, IsString, Matches, MaxLength } from "class-validator";
export class StartTumaPaymentDto {
  @IsIn(["MONTHLY", "ANNUAL"]) interval: "MONTHLY" | "ANNUAL";
  @IsString() @MaxLength(30) @Matches(/^[+\d\s()-]+$/) phone: string;
  @IsString() @Matches(/^[a-zA-Z0-9-]{16,80}$/) idempotencyKey: string;
}
