import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsInt()
  @Min(1)
  recipientId: number;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body: string;
}
