import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditAction } from '../common/decorators/audit.decorator';
import { OptionalParseIntPipe } from '../common/pipes/optional-parse-int.pipe';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // ---- Student / teacher inbox ----

  @Get('contacts')
  @Roles(Role.STUDENT, Role.TEACHER, Role.PLATFORM_ADMIN)
  findContacts(@CurrentUser() actor: AuthenticatedUser) {
    return this.messagesService.findContacts(actor);
  }

  @Get('unread-count')
  @Roles(Role.STUDENT, Role.TEACHER, Role.PLATFORM_ADMIN)
  getUnreadCount(@CurrentUser() actor: AuthenticatedUser) {
    return this.messagesService.getUnreadCount(actor);
  }

  @Get('thread/:userId')
  @Roles(Role.STUDENT, Role.TEACHER, Role.PLATFORM_ADMIN)
  findThread(@Param('userId', ParseIntPipe) userId: number, @CurrentUser() actor: AuthenticatedUser) {
    return this.messagesService.findThread(userId, actor);
  }

  @Post()
  @Roles(Role.STUDENT, Role.TEACHER, Role.PLATFORM_ADMIN)
  @AuditAction('message.send')
  sendMessage(@Body() dto: SendMessageDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.messagesService.sendMessage(dto, actor);
  }

  // ---- Read-only admin oversight ----

  @Get('admin/conversations')
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  findAdminConversations(@CurrentUser() actor: AuthenticatedUser, @Query('schoolId', new OptionalParseIntPipe()) schoolId?: number) {
    return this.messagesService.findAdminConversations(actor, schoolId);
  }

  @Get('admin/thread')
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  findAdminThread(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('studentId', ParseIntPipe) studentId: number,
    @Query('teacherId', ParseIntPipe) teacherId: number,
    @Query('schoolId', new OptionalParseIntPipe()) schoolId?: number,
  ) {
    return this.messagesService.findAdminThread(actor, studentId, teacherId, schoolId);
  }
}
