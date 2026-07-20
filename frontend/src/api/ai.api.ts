import { api } from './axios';
import type { GenerateAssignmentInput, GeneratedAssignmentJson } from '../types';

// Matches backend/src/ai/ai.controller.ts
export const aiApi = {
  generateAssignment: (dto: GenerateAssignmentInput) =>
    api
      .post<GeneratedAssignmentJson>('/ai/generate-assignment', dto)
      .then((r) => r.data),
};