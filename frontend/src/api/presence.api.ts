import { api } from './axios';

export type PresenceDeviceType = 'MOBILE' | 'TABLET' | 'DESKTOP' | 'UNKNOWN';
export type PresenceRange = '24h' | '7d' | '30d';

export interface PresenceDashboard {
  generatedAt: string;
  activeWindowSeconds: number;
  range: PresenceRange;
  metrics: {
    activeUsers: number;
    activeStudents: number;
    activeTeachers: number;
    activeAdmins: number;
    uniqueUsers: number;
    sessions: number;
    averageSessionMinutes: number;
    loginsToday: number;
    failedLoginsToday: number;
  };
  activeBySchool: Array<{
    schoolId: number;
    name: string;
    code: string;
    activeUsers: number;
    students: number;
    teachers: number;
  }>;
  activeUsers: Array<{
    userId: number;
    name: string;
    role: 'PLATFORM_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | 'STUDENT';
    school: { id: number; name: string; code: string };
    currentPath: string;
    module: string;
    deviceType: PresenceDeviceType;
    startedAt: string;
    lastSeenAt: string;
  }>;
  topModules: Array<{ name: string; sessions: number; activeUsers: number }>;
  trend: Array<{ label: string; sessions: number; uniqueUsers: number }>;
}

export const presenceApi = {
  heartbeat(payload: { sessionId: string; currentPath: string; deviceType: PresenceDeviceType }) {
    return api.post('/presence/heartbeat', payload).then((response) => response.data);
  },

  end(sessionId: string) {
    return api.post('/presence/end', { sessionId }).then((response) => response.data);
  },

  getDashboard(range: PresenceRange) {
    return api
      .get<PresenceDashboard>('/presence/platform/dashboard', { params: { range } })
      .then((response) => response.data);
  },
};
