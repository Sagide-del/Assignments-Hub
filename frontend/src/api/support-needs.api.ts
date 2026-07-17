import { api } from './axios';
import type { SupportInstitution, StudentSupportAssessment, DisabilityCategory, SupportLevel } from '../types';

// Matches backend/src/support-needs/support-needs.controller.ts.
export const supportNeedsApi = {
  findAllInstitutions: (params?: { type?: string; category?: string }) =>
    api.get<SupportInstitution[]>('/support-needs/institutions', { params }).then((r) => r.data),

  submitAssessment: (dto: {
    category: DisabilityCategory;
    supportLevel: SupportLevel;
    hasFormalAssessment: boolean;
    currentChallenges?: string;
    interests?: string[];
    notes?: string;
  }) => api.post<StudentSupportAssessment>('/support-needs/assessments', dto).then((r) => r.data),

  findAssessments: (params?: { schoolId?: number; grade?: string; category?: string }) =>
    api.get<StudentSupportAssessment[]>('/support-needs/assessments', { params }).then((r) => r.data),

  getStats: (schoolId?: number) =>
    api.get('/support-needs/assessments/stats', { params: { schoolId } }).then((r) => r.data),

  getStudentSummary: (studentId: number) =>
    api.get(`/support-needs/assessments/${studentId}/summary`).then((r) => r.data),
};
