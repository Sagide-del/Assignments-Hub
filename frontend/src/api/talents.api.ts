import { api } from './axios';
import type { StudentTalentProfile } from '../types';

// Matches backend/src/talents/talents.controller.ts.
export const talentsApi = {
  upsertMyProfile: (dto: {
    talents?: string[];
    strengths?: string[];
    interests?: string[];
    reflection?: string;
    growthPlan?: string;
  }) => api.post<StudentTalentProfile>('/talents/profile', dto).then((r) => r.data),

  getStudentProfile: (studentId: number) =>
    api
      .get<{ student: { id: number; name: string; grade: string | null }; profile: StudentTalentProfile | null }>(
        `/talents/profile/${studentId}`,
      )
      .then((r) => r.data),

  findAll: (params?: { schoolId?: number; grade?: string }) =>
    api
      .get<Array<{ id: number; studentId: number; talents: string[]; strengths: string[]; updatedAt: string; student: { id: number; name: string; grade: string | null } }>>(
        '/talents',
        { params },
      )
      .then((r) => r.data),
};
