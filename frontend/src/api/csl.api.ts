import { api } from './axios';
import type { CslActivity, CslSubmission } from '../types';

// Matches backend/src/csl-activities/csl-activities.controller.ts and
// backend/src/csl-submissions/csl-submissions.controller.ts.
export const cslActivitiesApi = {
  findAll: (grade?: string) => api.get<CslActivity[]>('/csl-activities', { params: { grade } }).then((r) => r.data),
  findOne: (id: number) => api.get<CslActivity>(`/csl-activities/${id}`).then((r) => r.data),
};

export const cslSubmissionsApi = {
  create: (dto: { cslActivityId: number; evidenceUrl?: string; reflection?: string }) =>
    api.post<CslSubmission>('/csl-submissions', dto).then((r) => r.data),

  findAll: (params?: { studentId?: number; cslActivityId?: number; schoolId?: number }) =>
    api.get<CslSubmission[]>('/csl-submissions', { params }).then((r) => r.data),

  findOne: (id: number) => api.get<CslSubmission>(`/csl-submissions/${id}`).then((r) => r.data),

  // Field is `feedback`, not `reviewerFeedback` — matches
  // backend/src/csl-submissions/dto/review-csl-submission.dto.ts exactly.
  review: (id: number, dto: { status: 'APPROVED' | 'NEEDS_REVISION'; score?: number; maxScore?: number; feedback?: string }) =>
    api.patch<CslSubmission>(`/csl-submissions/${id}/review`, dto).then((r) => r.data),
};
