import { PresenceDeviceType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsUUID, MaxLength } from 'class-validator';

export class PresenceHeartbeatDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sessionId!: string;

  @ApiProperty({ example: '/student/my-assignments/42' })
  @IsString()
  @MaxLength(240)
  currentPath!: string;

  @ApiProperty({ enum: PresenceDeviceType })
  @IsEnum(PresenceDeviceType)
  deviceType!: PresenceDeviceType;
}
