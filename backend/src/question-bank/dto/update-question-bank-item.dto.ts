import { IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class UpdateQuestionBankItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(4_000)
  questionText?: string;

  @IsOptional()
  @IsArray()
  options?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(4_000)
  correctAnswer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5_000)
  explanation?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000)
  points?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  hint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  topic?: string;

  // Set via the existing generic /api/v1/uploads/single endpoint — the
  // frontend uploads the file there first and PUTs the returned URL here.
  // An empty string clears a previously-set diagram (see
  // QuestionBankService.update); omitting the field entirely leaves it
  // unchanged.
  @IsOptional()
  @IsString()
  @MaxLength(2_048)
  diagramUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  diagramAlt?: string;
}
