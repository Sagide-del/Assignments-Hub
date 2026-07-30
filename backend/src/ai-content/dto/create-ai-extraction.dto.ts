import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateAiExtractionDto {
  @ApiProperty({ example: "Biology" })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  subject: string;

  @ApiPropertyOptional({ example: "Grade 10" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  grade?: string;
}
