import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateLabMediaDto {
  @IsString()
  @MaxLength(50)
  type: string;

  @IsString()
  @MaxLength(500)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  caption?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
