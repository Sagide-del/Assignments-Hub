import { api } from './axios';
import type { Submission } from '../types';

// Matches backend/src/submissions/submissions.controller.ts and
// dto/grade-submission.dto.ts + dto/grade-answer.dto.ts EXACTLY — field
// names are pointsAwarded/feedback per answer, score/feedback overall.
export const submissionsApi = {
  findAll: (params?: { assignmentId?: number; schoolId?: number }) =>
    api.get<Submission[]>('/submissions', { params }).then((r) => r.data),

  findOne: (id: number) => api.get<Submission>(`/submissions/${id}`).then((r) => r.data),

  grade: (
    id: number,
    dto: {
      score?: number;
      feedback?: string;
      answers?: { questionId: number; pointsAwarded?: number; feedback?: string }[];
    },
  ) => api.patch<Submission>(`/submissions/${id}/grade`, dto).then((r) => r.data),
};
