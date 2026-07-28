import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateMnemonicCardDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  subject: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  topic: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  grade?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsString()
  @Matches(/^(?:\/uploads\/|https?:\/\/).+\.pdf(?:\?.*)?$/i, {
    message: 'pdfUrl must reference a PDF upload',
  })
  pdfUrl: string;

  @IsString()
  @MaxLength(255)
  @Matches(/\.pdf$/i, { message: 'fileName must end in .pdf' })
  fileName: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(15 * 1024 * 1024)
  fileSize?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  displayOrder?: number;
}
