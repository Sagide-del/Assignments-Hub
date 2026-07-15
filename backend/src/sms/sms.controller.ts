import { Body, Controller, ForbiddenException, Get, NotFoundException, Param, ParseIntPipe, Post } from '@nestjs/common';
import { SmsService } from './sms.service';
import { BroadcastSmsDto } from './dto/broadcast-sms.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditAction } from '../common/decorators/audit.decorator';

@Controller('sms')
export class SmsController {
  constructor(
    private readonly smsService: SmsService,
    private readonly prisma: PrismaService,
  ) {}

  // Mass/broadcast SMS — School Admins and Teachers can message all (or one
  // grade's worth of) parents at once. Handy for holiday reminders, term
  // updates, or "school reopens on..." announcements.
  @Post('broadcast')
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN, Role.TEACHER)
  @AuditAction('sms.broadcast')
  async broadcast(@Body() dto: BroadcastSmsDto, @CurrentUser() actor: AuthenticatedUser) {
    const recipients = await this.smsService.getStudentRecipients(actor.schoolId, dto.grade);
    const summary = await this.smsService.broadcast({
      schoolId: actor.schoolId,
      message: dto.message,
      recipients,
      sentById: actor.id,
    });
    return { ...summary, gatewayConfigured: this.smsService.isEnabled() };
  }

  // Manually (re-)notify parents that a specific assignment was posted —
  // e.g. a teacher publishes an assignment ahead of the holidays without
  // auto-notify, then decides later to remind parents.
  @Post('notify-assignment/:assignmentId')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  @AuditAction('sms.notify_assignment')
  async notifyAssignment(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const assignment = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (actor.role !== Role.PLATFORM_ADMIN && assignment.schoolId !== actor.schoolId) {
      throw new ForbiddenException('You cannot access another school\'s data');
    }

    const recipients = await this.smsService.getStudentRecipients(assignment.schoolId, assignment.grade);
    const summary = await this.smsService.notifyNewAssignment({
      schoolId: assignment.schoolId,
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      subject: assignment.subject,
      grade: assignment.grade,
      dueDate: assignment.dueDate,
      recipients,
      sentById: actor.id,
    });
    return { ...summary, gatewayConfigured: this.smsService.isEnabled() };
  }

  // Recent send history for the School Admin's "Messaging" tab.
  @Get('logs')
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN, Role.TEACHER)
  async logs(@CurrentUser() actor: AuthenticatedUser) {
    return this.smsService.getLogs(actor.schoolId);
  }
}
