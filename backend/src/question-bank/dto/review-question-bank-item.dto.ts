import { IsOptional, IsString, MaxLength } from "class-validator";

export class RejectQuestionBankItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  notes?: string;
}
