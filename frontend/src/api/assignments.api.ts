import { api } from './axios';
import type { Assignment, Submission, Question, AnswerInput } from '../types';

export interface CreateQuestionInput {
  questionText: string;
  questionType?: Question['questionType'];
  options?: string[];
  correctAnswer?: string;
  points?: number;
  order?: number;
  hint?: string;
}

export interface CreateAssignmentInput {
  title: string;
  description?: string;
  subject: string;
  grade: string;
  type?: string;
  dueDate?: string;
  maxPoints?: number;
  isPublished?: boolean;
  questions?: CreateQuestionInput[];
  // One-shot instruction, not persisted: SMS every parent with a phone on
  // file in this grade when the assignment is created. Real and wired —
  // see backend/src/assignments/dto/create-assignment.dto.ts and
  // AssignmentsService.create / SmsService.notifyNewAssignment. Only
  // available on the manual-create path (POST /assignments), not JSON upload.
  notifyParents?: boolean;
}

// Matches backend/src/assignments/assignments.controller.ts.
export const assignmentsApi = {
  findAll: (schoolId?: number) =>
    api.get<Assignment[]>('/assignments', { params: { schoolId } }).then((r) => r.data),

  findOne: (id: number) => api.get<Assignment>(`/assignments/${id}`).then((r) => r.data),

  // Flat question list (assignment.questions) — sectionId is null for
  // manually-built assignments, set for JSON-uploaded ones with sections.
  findQuestions: (id: number) => api.get<Question[]>(`/assignments/${id}/questions`).then((r) => r.data),

  // Structural validation only — no persistence. Powers an upload preview
  // that shows every problem in the JSON before the teacher hits publish.
  validateJson: (examJson: unknown) =>
    api
      .post<{ valid: boolean; errors: string[]; computedTotalMarks: number }>('/assignments/validate', examJson)
      .then((r) => r.data),

  createFromJson: (examJson: unknown) =>
    api.post<Assignment>('/assignments/from-json', examJson).then((r) => r.data),

  create: (dto: CreateAssignmentInput) => api.post<Assignment>('/assignments', dto).then((r) => r.data),

  update: (id: number, dto: Partial<Assignment>) =>
    api.patch<Assignment>(`/assignments/${id}`, dto).then((r) => r.data),

  remove: (id: number) => api.delete(`/assignments/${id}`),

  submit: (assignmentId: number, dto: { answers?: AnswerInput[]; isDraft?: boolean; timeSpentSeconds?: number }) =>
    api.post<Submission>(`/assignments/${assignmentId}/submissions`, dto).then((r) => r.data),

  listSubmissions: (assignmentId: number) =>
    api.get<Submission[]>(`/assignments/${assignmentId}/submissions`).then((r) => r.data),
};
