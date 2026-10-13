import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export const PRESENCE_RANGES = ['24h', '7d', '30d'] as const;
export type PresenceRange = (typeof PRESENCE_RANGES)[number];

export class PresenceRangeDto {
  @ApiPropertyOptional({ enum: PRESENCE_RANGES, default: '24h' })
  @IsOptional()
  @IsIn(PRESENCE_RANGES)
  range: PresenceRange = '24h';
}
