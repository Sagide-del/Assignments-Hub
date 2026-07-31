import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

// Read-only performance aggregates for teachers/admins. STUDENT is
// deliberately never in @Roles here, same as ReportsController — a
// student JWT is rejected by the global RolesGuard before any handler
// runs (see backend/src/common/guards/roles.guard.ts).
@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('assignment/:id')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Performance analytics for one assignment: scores, per-question stats, student tracking' })
  assignmentAnalytics(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.analytics.assignmentAnalytics(id, actor);
  }
}
