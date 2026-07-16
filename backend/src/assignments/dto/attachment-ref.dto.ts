import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

// Metadata for a file already uploaded via POST /uploads/single — the
// assignment/submission stores this reference, not the file itself.
export class AttachmentRefDto {
  @IsString()
  @MinLength(1)
  filename: string;

  @IsString()
  @MinLength(1)
  url: string;

  @IsOptional()
  @IsInt()
  size?: number;
}
