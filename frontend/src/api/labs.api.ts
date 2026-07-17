import { api } from './axios';
import type { Lab, LabSession, AnswerInput } from '../types';

// Matches backend/src/labs/labs.controller.ts and
// backend/src/lab-sessions/lab-sessions.controller.ts.
export const labsApi = {
  findAll: (grade?: string) => api.get<Lab[]>('/labs', { params: { grade } }).then((r) => r.data),
  findOne: (id: number) => api.get<Lab>(`/labs/${id}`).then((r) => r.data),
};

export const labSessionsApi = {
  // answers uses AnswerInputDto's shape ({ questionId, answer }) — same DTO
  // the submissions module uses — NOT the Answer entity's `studentAnswer`
  // field. See backend/src/lab-sessions/dto/create-lab-session.dto.ts.
  create: (dto: { labKey: string; competency?: string; answers?: AnswerInput[] }) =>
    api.post<LabSession>('/lab-sessions', dto).then((r) => r.data),

  findAll: (params?: { studentId?: number; schoolId?: number }) =>
    api.get<LabSession[]>('/lab-sessions', { params }).then((r) => r.data),
};
