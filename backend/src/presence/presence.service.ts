import { ForbiddenException, Injectable } from '@nestjs/common';
import { PresenceDeviceType, Role } from '@prisma/client';

import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { PresenceHeartbeatDto } from './dto/presence-heartbeat.dto';
import { PresenceRange } from './dto/presence-range.dto';

const ACTIVE_WINDOW_MS = 2 * 60 * 1000;

type SessionRecord = {
  userId: number;
  role: Role;
  currentPath: string;
  deviceType: PresenceDeviceType;
  startedAt: Date;
  lastSeenAt: Date;
  endedAt: Date | null;
  user: { name: string };
  school: { id: number; name: string; code: string };
};

@Injectable()
export class PresenceService {
  constructor(private readonly prisma: PrismaService) {}

  async heartbeat(dto: PresenceHeartbeatDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.userPresenceSession.findUnique({
      where: { sessionId: dto.sessionId },
      select: { userId: true },
    });

    if (existing && existing.userId !== actor.id) {
      throw new ForbiddenException('This presence session belongs to another user');
    }

    const now = new Date();
    const session = await this.prisma.userPresenceSession.upsert({
      where: { sessionId: dto.sessionId },
      create: {
        sessionId: dto.sessionId,
        userId: actor.id,
        schoolId: actor.schoolId,
        role: actor.role,
        deviceType: dto.deviceType,
        currentPath: this.normalizePath(dto.currentPath),
        startedAt: now,
        lastSeenAt: now,
      },
      update: {
        schoolId: actor.schoolId,
        role: actor.role,
        deviceType: dto.deviceType,
        currentPath: this.normalizePath(dto.currentPath),
        lastSeenAt: now,
        endedAt: null,
      },
      select: { lastSeenAt: true },
    });

    return {
      ok: true,
      lastSeenAt: session.lastSeenAt,
      activeWindowSeconds: ACTIVE_WINDOW_MS / 1000,
    };
  }

  async endSession(sessionId: string, actor: AuthenticatedUser) {
    const now = new Date();
    await this.prisma.userPresenceSession.updateMany({
      where: { sessionId, userId: actor.id },
      data: { endedAt: now, lastSeenAt: now },
    });
    return { ok: true };
  }

  async platformDashboard(range: PresenceRange) {
    const now = new Date();
    const activeCutoff = new Date(now.getTime() - ACTIVE_WINDOW_MS);
    const periodCutoff = this.periodCutoff(now, range);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const include = {
      user: { select: { name: true } },
      school: { select: { id: true, name: true, code: true } },
    } as const;

    const [activeSessions, periodSessions, loginsToday, failedLoginsToday] = await Promise.all([
      this.prisma.userPresenceSession.findMany({
        where: { endedAt: null, lastSeenAt: { gte: activeCutoff } },
        include,
        orderBy: { lastSeenAt: 'desc' },
      }),
      this.prisma.userPresenceSession.findMany({
        where: { startedAt: { gte: periodCutoff } },
        include,
        orderBy: { startedAt: 'asc' },
      }),
      this.prisma.auditLog.count({
        where: { action: 'auth.login', createdAt: { gte: today } },
      }),
      this.prisma.auditLog.count({
        where: { action: 'auth.login.failed', createdAt: { gte: today } },
      }),
    ]);

    const activeUsers = this.latestSessionPerUser(activeSessions);
    const periodUserIds = new Set(periodSessions.map((session) => session.userId));
    const totalDurationMs = periodSessions.reduce((total, session) => {
      const end = session.endedAt ?? session.lastSeenAt;
      return total + Math.max(0, end.getTime() - session.startedAt.getTime());
    }, 0);

    return {
      generatedAt: now,
      activeWindowSeconds: ACTIVE_WINDOW_MS / 1000,
      range,
      metrics: {
        activeUsers: activeUsers.length,
        activeStudents: activeUsers.filter((session) => session.role === Role.STUDENT).length,
        activeTeachers: activeUsers.filter((session) => session.role === Role.TEACHER).length,
        activeAdmins: activeUsers.filter((session) =>
          session.role === Role.SCHOOL_ADMIN || session.role === Role.PLATFORM_ADMIN,
        ).length,
        uniqueUsers: periodUserIds.size,
        sessions: periodSessions.length,
        averageSessionMinutes: periodSessions.length
          ? Math.round(totalDurationMs / periodSessions.length / 60000)
          : 0,
        loginsToday,
        failedLoginsToday,
      },
      activeBySchool: this.activeBySchool(activeUsers),
      activeUsers: activeUsers.slice(0, 30).map((session) => ({
        userId: session.userId,
        name: session.user.name,
        role: session.role,
        school: session.school,
        currentPath: session.currentPath,
        module: this.moduleName(session.currentPath),
        deviceType: session.deviceType,
        startedAt: session.startedAt,
        lastSeenAt: session.lastSeenAt,
      })),
      topModules: this.topModules(activeUsers, periodSessions),
      trend: this.buildTrend(periodSessions, range, now),
    };
  }

  private normalizePath(value: string) {
    const path = value.split(/[?#]/, 1)[0] || '/';
    const normalized = path
      .replace(/\/[0-9]+(?=\/|$)/g, '/:id')
      .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}(?=\/|$)/gi, '/:id');
    return (normalized.startsWith('/') ? normalized : `/${normalized}`).slice(0, 240);
  }

  private periodCutoff(now: Date, range: PresenceRange) {
    const hours = range === '24h' ? 24 : range === '7d' ? 24 * 7 : 24 * 30;
    return new Date(now.getTime() - hours * 60 * 60 * 1000);
  }

  private latestSessionPerUser<T extends SessionRecord>(sessions: T[]) {
    const byUser = new Map<number, T>();
    for (const session of sessions) {
      const current = byUser.get(session.userId);
      if (!current || session.lastSeenAt > current.lastSeenAt) byUser.set(session.userId, session);
    }
    return [...byUser.values()].sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());
  }

  private activeBySchool(activeUsers: SessionRecord[]) {
    const schools = new Map<number, {
      schoolId: number;
      name: string;
      code: string;
      activeUsers: number;
      students: number;
      teachers: number;
    }>();

    for (const session of activeUsers) {
      const item = schools.get(session.school.id) ?? {
        schoolId: session.school.id,
        name: session.school.name,
        code: session.school.code,
        activeUsers: 0,
        students: 0,
        teachers: 0,
      };
      item.activeUsers += 1;
      if (session.role === Role.STUDENT) item.students += 1;
      if (session.role === Role.TEACHER) item.teachers += 1;
      schools.set(session.school.id, item);
    }

    return [...schools.values()].sort((a, b) => b.activeUsers - a.activeUsers);
  }

  private topModules(activeUsers: SessionRecord[], periodSessions: SessionRecord[]) {
    const modules = new Map<string, { name: string; sessions: number; activeUserIds: Set<number> }>();
    for (const session of periodSessions) {
      const name = this.moduleName(session.currentPath);
      const item = modules.get(name) ?? { name, sessions: 0, activeUserIds: new Set<number>() };
      item.sessions += 1;
      modules.set(name, item);
    }
    for (const session of activeUsers) {
      const name = this.moduleName(session.currentPath);
      const item = modules.get(name) ?? { name, sessions: 0, activeUserIds: new Set<number>() };
      item.activeUserIds.add(session.userId);
      modules.set(name, item);
    }
    return [...modules.values()]
      .map(({ activeUserIds, ...item }) => ({ ...item, activeUsers: activeUserIds.size }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 8);
  }

  private moduleName(path: string) {
    if (path.includes('my-assignments') || path.includes('/assignments')) return 'Assignments';
    if (path.includes('stem')) return 'STEM Labs';
    if (path.includes('learn-skills') || path.includes('skill')) return 'Learn a Skill';
    if (path.includes('resources')) return 'Resources';
    if (path.includes('kjsea')) return 'Mock Tests';
    if (path.includes('kcse')) return 'Mock Tests';
    if (path.includes('mnemonic')) return 'Mnemonic Cards';
    if (path.startsWith('/teacher')) return 'Teacher workspace';
    if (path.startsWith('/school-admin')) return 'School administration';
    if (path.startsWith('/platform')) return 'Platform console';
    return 'Other';
  }

  private buildTrend(sessions: SessionRecord[], range: PresenceRange, now: Date) {
    const hourly = range === '24h';
    const bucketCount = hourly ? 24 : range === '7d' ? 7 : 30;
    const buckets = Array.from({ length: bucketCount }, (_, index) => {
      const date = new Date(now);
      if (hourly) {
        date.setMinutes(0, 0, 0);
        date.setHours(date.getHours() - (bucketCount - index - 1));
      } else {
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - (bucketCount - index - 1));
      }
      return { date, sessions: 0, userIds: new Set<number>() };
    });

    const bucketMs = hourly ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const start = buckets[0]?.date.getTime() ?? now.getTime();
    for (const session of sessions) {
      const index = Math.floor((session.startedAt.getTime() - start) / bucketMs);
      if (index >= 0 && index < buckets.length) {
        buckets[index].sessions += 1;
        buckets[index].userIds.add(session.userId);
      }
    }

    return buckets.map((bucket) => ({
      label: hourly
        ? bucket.date.toLocaleTimeString('en-KE', { hour: '2-digit' })
        : bucket.date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
      sessions: bucket.sessions,
      uniqueUsers: bucket.userIds.size,
    }));
  }
}
