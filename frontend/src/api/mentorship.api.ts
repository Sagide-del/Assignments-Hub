import { api } from './axios';
import type { MentorDirectoryEntry, MentorshipLogEntry, MentorshipRequest, MentorshipStats } from '../types';

// Matches backend/src/mentorship/mentorship.controller.ts.
export const mentorshipApi = {
  findMentors: (schoolId?: number) =>
    api.get<MentorDirectoryEntry[]>('/mentorship/mentors', { params: { schoolId } }).then((r) => r.data),

  upsertMyMentorProfile: (dto: { bio?: string; expertiseAreas?: string[]; isAvailable?: boolean }) =>
    api.post('/mentorship/profile', dto).then((r) => r.data),

  createRequest: (dto: { teacherId: number; topic: string; message?: string }) =>
    api.post<MentorshipRequest>('/mentorship/requests', dto).then((r) => r.data),

  findRequests: (params?: { schoolId?: number; status?: string }) =>
    api.get<MentorshipRequest[]>('/mentorship/requests', { params }).then((r) => r.data),

  updateStatus: (id: number, status: 'ACCEPTED' | 'DECLINED' | 'COMPLETED') =>
    api.patch<MentorshipRequest>(`/mentorship/requests/${id}/status`, { status }).then((r) => r.data),

  addLogEntry: (id: number, note: string) =>
    api.post<MentorshipLogEntry>(`/mentorship/requests/${id}/log`, { note }).then((r) => r.data),

  getStats: (schoolId?: number) =>
    api.get<MentorshipStats>('/mentorship/stats', { params: { schoolId } }).then((r) => r.data),
};
