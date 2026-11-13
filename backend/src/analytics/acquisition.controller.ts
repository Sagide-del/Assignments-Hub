import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AcquisitionEventDto } from './dto/acquisition-event.dto';
import { AcquisitionService } from './acquisition.service';
@UseGuards(ThrottlerGuard)
@Controller('analytics/acquisition')
export class AcquisitionController {
  constructor(private readonly acquisition: AcquisitionService) {}
  @Get('capabilities') @Public()
  async capabilities() { await this.acquisition.ready(); return { ready: true, version: 1 }; }
  @Post('events') @Public() @HttpCode(202)
  @Throttle({ default: { limit: 40, ttl: 60000 } })
  async event(@Body() dto: AcquisitionEventDto) { await this.acquisition.record(dto); return { accepted: true }; }
  @Get() @Roles(Role.PLATFORM_ADMIN)
  summary() { return this.acquisition.summary(); }
}
