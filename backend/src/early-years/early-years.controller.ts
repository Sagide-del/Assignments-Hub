import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CompleteEarlyYearsDto, GenerateEarlyYearsDto, PublishEarlyYearsDto } from './dto/early-years.dto';
import { EarlyYearsService } from './early-years.service';

@Controller('early-years')
export class EarlyYearsController {
  constructor(private readonly service: EarlyYearsService) {}
  @Get('next') next(@CurrentUser() actor: AuthenticatedUser) { return this.service.next(actor); }
  @Post('complete') complete(@Body() dto: CompleteEarlyYearsDto, @CurrentUser() actor: AuthenticatedUser) { return this.service.complete(dto.activityId, actor); }
  @Get('admin') @Roles(Role.PLATFORM_ADMIN) list() { return this.service.listAdmin(); }
  @Post('admin/generate') @Roles(Role.PLATFORM_ADMIN) generate(@Body() dto: GenerateEarlyYearsDto, @CurrentUser() actor: AuthenticatedUser) { return this.service.generate(dto, actor); }
  @Patch('admin/:id') @Roles(Role.PLATFORM_ADMIN) publish(@Param('id') id: string, @Body() dto: PublishEarlyYearsDto) { return this.service.publish(id, dto.status); }
}
