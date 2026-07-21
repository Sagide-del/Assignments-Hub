import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLabCompletionReportTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  summary?: string;

  @IsOptional()
  outcomesJson?: unknown;
}
