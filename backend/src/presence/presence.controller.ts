import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PresenceHeartbeatDto } from './dto/presence-heartbeat.dto';
import { EndPresenceSessionDto } from './dto/end-presence-session.dto';
import { PresenceRangeDto } from './dto/presence-range.dto';
import { PresenceService } from './presence.service';

@ApiTags('Presence')
@ApiBearerAuth()
@Controller('presence')
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Post('heartbeat')
  @Roles(Role.STUDENT, Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Refresh the authenticated browser presence session' })
  heartbeat(@Body() dto: PresenceHeartbeatDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.presenceService.heartbeat(dto, actor);
  }

  @Post('end')
  @Roles(Role.STUDENT, Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'End the authenticated browser presence session' })
  end(@Body() dto: EndPresenceSessionDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.presenceService.endSession(dto.sessionId, actor);
  }

  @Get('platform/dashboard')
  @Roles(Role.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Get live and historical platform usage summaries' })
  dashboard(@Query() query: PresenceRangeDto) {
    return this.presenceService.platformDashboard(query.range);
  }
}
