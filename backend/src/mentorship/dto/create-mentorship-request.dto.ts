import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateMentorshipRequestDto {
  @IsInt()
  @Min(1)
  teacherId: number;

  @IsString()
  @MaxLength(200)
  topic: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
