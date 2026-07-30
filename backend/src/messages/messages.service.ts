import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../common/enums/role.enum';
import type { Prisma } from '@prisma/client';

const INDEPENDENT_SCHOOL_CODE = 'INDEPENDENT';
const CONTACT_SELECT = {
  id: true,
  name: true,
  role: true,
  subject: true,
  grade: true,
  assignedClass: true,
} as const;
const PARTY_SELECT = { id: true, name: true, role: true } as const;

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  // A STUDENT may only message a TEACHER (and vice versa), and only within
  // their own school — mirrors the Mentorship directory's "any teacher at
  // their school" scope, just two-way. Not exported: every public method
  // below runs this before touching a Message row.
  private async assertCanMessage(actor: AuthenticatedUser, otherUserId: number) {
    const other = await this.prisma.user.findUnique({
      where: { id: otherUserId },
      include: { school: { select: { code: true } } },
    });
    if (!other) throw new NotFoundException('That person is not available to message');

    let allowed = false;
    let conversationSchoolId = actor.schoolId;

    if (actor.role === Role.PLATFORM_ADMIN) {
      allowed =
        other.role === Role.STUDENT &&
        other.school.code === INDEPENDENT_SCHOOL_CODE;
      conversationSchoolId = other.schoolId;
    } else if (actor.role === Role.TEACHER) {
      allowed =
        other.role === Role.STUDENT &&
        other.schoolId === actor.schoolId;
    } else if (actor.role === Role.STUDENT) {
      const actorSchool = await this.prisma.school.findUnique({
        where: { id: actor.schoolId },
        select: { code: true },
      });
      allowed =
        actorSchool?.code === INDEPENDENT_SCHOOL_CODE
          ? other.role === Role.PLATFORM_ADMIN
          : other.role === Role.TEACHER && other.schoolId === actor.schoolId;
    }

    if (!allowed) {
      throw new NotFoundException('That person is not available to message');
    }
    return { other, conversationSchoolId };
  }

  // ==========================================================================
  // Contacts — the inbox list. Every active person the actor is allowed to
  // message, each annotated with their most recent message (if any) and how
  // many of the actor's messages from them are still unread, computed from a
  // single fetch of the actor's own messages rather than one query per
  // contact.
  // ==========================================================================
  async findContacts(actor: AuthenticatedUser) {
    let conversationSchoolId = actor.schoolId;
    let contactWhere: Prisma.UserWhereInput;

    if (actor.role === Role.PLATFORM_ADMIN) {
      const independentSchool = await this.prisma.school.findUnique({
        where: { code: INDEPENDENT_SCHOOL_CODE },
        select: { id: true },
      });
      if (!independentSchool) return [];
      conversationSchoolId = independentSchool.id;
      contactWhere = {
        schoolId: independentSchool.id,
        role: Role.STUDENT,
        isActive: true,
      };
    } else if (actor.role === Role.STUDENT) {
      const actorSchool = await this.prisma.school.findUnique({
        where: { id: actor.schoolId },
        select: { code: true },
      });
      contactWhere =
        actorSchool?.code === INDEPENDENT_SCHOOL_CODE
          ? { role: Role.PLATFORM_ADMIN, isActive: true }
          : { schoolId: actor.schoolId, role: Role.TEACHER, isActive: true };
    } else {
      contactWhere = {
        schoolId: actor.schoolId,
        role: Role.STUDENT,
        isActive: true,
      };
    }

    const [contacts, messages] = await Promise.all([
      this.prisma.user.findMany({
        where: contactWhere,
        select: CONTACT_SELECT,
        orderBy: { name: 'asc' },
      }),
      this.prisma.message.findMany({
        where: {
          schoolId: conversationSchoolId,
          OR: [{ senderId: actor.id }, { recipientId: actor.id }],
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Messages are already sorted newest-first, so the first time a
    // counterpart is seen while walking the list is their latest message.
    const byCounterpart = new Map<number, { lastMessage: (typeof messages)[number]; unreadCount: number }>();
    for (const message of messages) {
      const counterpartId = message.senderId === actor.id ? message.recipientId : message.senderId;
      const entry = byCounterpart.get(counterpartId) ?? { lastMessage: message, unreadCount: 0 };
      if (message.recipientId === actor.id && !message.readAt) entry.unreadCount += 1;
      byCounterpart.set(counterpartId, entry);
    }

    return contacts
      .map((contact) => {
        const entry = byCounterpart.get(contact.id);
        return {
          id: contact.id,
          name: contact.name,
          role: contact.role,
          relationshipLabel:
            contact.role === Role.PLATFORM_ADMIN
              ? 'Private Tutor'
              : contact.role === Role.STUDENT
                ? contact.grade ?? 'Independent Student'
                : contact.subject ?? 'Teacher',
          subject: contact.subject,
          grade: contact.grade,
          assignedClass: contact.assignedClass,
          lastMessage: entry
            ? { body: entry.lastMessage.body, createdAt: entry.lastMessage.createdAt, senderId: entry.lastMessage.senderId }
            : null,
          unreadCount: entry?.unreadCount ?? 0,
        };
      })
      .sort((a, b) => {
        const at = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const bt = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return bt - at || a.name.localeCompare(b.name);
      });
  }

  getUnreadCount(actor: AuthenticatedUser) {
    return this.prisma.message
      .count({ where: { recipientId: actor.id, readAt: null } })
      .then((count) => ({ count }));
  }

  // Full thread with one counterpart, oldest first. Opening a thread marks
  // every unread message the actor received in it as read.
  async findThread(otherUserId: number, actor: AuthenticatedUser) {
    const { conversationSchoolId } = await this.assertCanMessage(actor, otherUserId);

    const where = {
      schoolId: conversationSchoolId,
      OR: [
        { senderId: actor.id, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: actor.id },
      ],
    };

    await this.prisma.message.updateMany({
      where: { ...where, recipientId: actor.id, readAt: null },
      data: { readAt: new Date() },
    });

    return this.prisma.message.findMany({ where, orderBy: { createdAt: 'asc' } });
  }

  async sendMessage(dto: SendMessageDto, actor: AuthenticatedUser) {
    const { other: recipient, conversationSchoolId } = await this.assertCanMessage(
      actor,
      dto.recipientId,
    );
    if (!recipient.isActive) {
      throw new ForbiddenException('That person\'s account is no longer active');
    }

    return this.prisma.message.create({
      data: {
        schoolId: conversationSchoolId,
        senderId: actor.id,
        recipientId: recipient.id,
        body: dto.body,
      },
    });
  }

  // ==========================================================================
  // Admin oversight — SCHOOL_ADMIN (own school) / PLATFORM_ADMIN (any school
  // via schoolId) get read-only visibility into every conversation, the same
  // transparency precedent as Parent Corner. Neither role can send.
  // ==========================================================================

  async findAdminConversations(actor: AuthenticatedUser, schoolId?: number) {
    const targetSchoolId = actor.role === Role.PLATFORM_ADMIN ? schoolId : actor.schoolId;

    const messages = await this.prisma.message.findMany({
      where: { schoolId: targetSchoolId },
      include: { sender: { select: PARTY_SELECT }, recipient: { select: PARTY_SELECT } },
      orderBy: { createdAt: 'desc' },
    });

    const byPair = new Map<
      string,
      { student: (typeof messages)[number]['sender']; teacher: (typeof messages)[number]['sender']; lastMessage: (typeof messages)[number]; messageCount: number }
    >();
    for (const message of messages) {
      const student = message.sender.role === Role.STUDENT ? message.sender : message.recipient;
      const teacher = message.sender.role === Role.STUDENT ? message.recipient : message.sender;
      const key = `${student.id}:${teacher.id}`;
      const entry = byPair.get(key) ?? { student, teacher, lastMessage: message, messageCount: 0 };
      entry.messageCount += 1;
      byPair.set(key, entry);
    }

    return Array.from(byPair.values())
      .map((entry) => ({
        student: entry.student,
        teacher: entry.teacher,
        lastMessage: { body: entry.lastMessage.body, createdAt: entry.lastMessage.createdAt, senderId: entry.lastMessage.senderId },
        messageCount: entry.messageCount,
      }))
      .sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());
  }

  findAdminThread(actor: AuthenticatedUser, studentId: number, teacherId: number, schoolId?: number) {
    const targetSchoolId = actor.role === Role.PLATFORM_ADMIN ? schoolId : actor.schoolId;

    return this.prisma.message.findMany({
      where: {
        schoolId: targetSchoolId,
        OR: [
          { senderId: studentId, recipientId: teacherId },
          { senderId: teacherId, recipientId: studentId },
        ],
      },
      include: { sender: { select: PARTY_SELECT }, recipient: { select: PARTY_SELECT } },
      orderBy: { createdAt: 'asc' },
    });
  }
}
