import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class EndPresenceSessionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sessionId!: string;
}
