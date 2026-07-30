import { api } from './axios';

export type QuestionBankStatus = 'GENERATED' | 'APPROVED' | 'REJECTED';

export type QuestionBankQuestionType =
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE'
  | 'NUMERIC'
  | 'SHORT_ANSWER'
  | 'ESSAY';

export interface QuestionBankItem {
  id: number;
  source: 'PLATFORM' | 'SCHOOL';
  isGlobal: boolean;
  subject: string;
  grade: string;
  topic: string;
  questionText: string;
  contentHtml: string | null;
  questionType: QuestionBankQuestionType;
  options: string[] | null;
  correctAnswer: string | null;
  explanation: string | null;
  points: number;
  hint: string | null;
  difficulty: string | null;
  status: QuestionBankStatus;
  generationBatchId: string | null;
  sourceFileName: string | null;
  publishedAssignmentId: number | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface SchoolQuestionBankAccess {
  id: number;
  schoolId: number;
  active: boolean;
  activatedAt: string;
  school: { id: number; name: string; code: string };
}

function questionBankFormData(input: {
  file: File;
  subject: string;
  grade: string;
  topic: string;
  questionCount?: number;
  difficulty?: string;
  questionTypes?: QuestionBankQuestionType[];
}) {
  const body = new FormData();
  body.append('file', input.file);
  body.append('subject', input.subject);
  body.append('grade', input.grade);
  body.append('topic', input.topic);
  if (input.questionCount) body.append('questionCount', String(input.questionCount));
  if (input.difficulty) body.append('difficulty', input.difficulty);
  if (input.questionTypes?.length) {
    body.append('questionTypes', JSON.stringify(input.questionTypes));
  }
  return body;
}

export const questionBankAdminApi = {
  generate: (input: {
    file: File;
    subject: string;
    grade: string;
    topic: string;
    questionCount?: number;
    difficulty?: string;
    questionTypes?: QuestionBankQuestionType[];
  }) =>
    api
      .post<QuestionBankItem[]>('/admin/question-bank/generate', questionBankFormData(input))
      .then((response) => response.data),

  list: (params?: {
    subject?: string;
    grade?: string;
    topic?: string;
    status?: QuestionBankStatus;
    skip?: number;
    take?: number;
  }) =>
    api
      .get<{ items: QuestionBankItem[]; total: number; skip: number; take: number }>(
        '/admin/question-bank',
        { params },
      )
      .then((response) => response.data),

  update: (id: number, update: Partial<Pick<QuestionBankItem, 'questionText' | 'options' | 'correctAnswer' | 'explanation' | 'points' | 'hint' | 'topic'>>) =>
    api.put<QuestionBankItem>(`/admin/question-bank/${id}`, update).then((response) => response.data),

  remove: (id: number) =>
    api.delete<{ id: number; deleted: boolean }>(`/admin/question-bank/${id}`).then((response) => response.data),

  approve: (id: number) =>
    api.post<QuestionBankItem>(`/admin/question-bank/${id}/approve`).then((response) => response.data),

  reject: (id: number, notes?: string) =>
    api.post<QuestionBankItem>(`/admin/question-bank/${id}/reject`, { notes }).then((response) => response.data),

  publish: (input: { questionIds: number[]; title: string; description?: string; dueDate?: string; isPublished?: boolean }) =>
    api
      .post<{ assignmentId: number; questionCount: number }>('/admin/question-bank/publish', input)
      .then((response) => response.data),

  activateSchool: (input: { schoolId: number; active?: boolean }) =>
    api.post<SchoolQuestionBankAccess>('/admin/question-bank/activate-school', input).then((response) => response.data),

  listSchoolAccess: () =>
    api.get<SchoolQuestionBankAccess[]>('/admin/question-bank/school-access/list').then((response) => response.data),
};

export const questionBankApi = {
  browse: (params?: { subject?: string; grade?: string; topic?: string; skip?: number; take?: number }) =>
    api
      .get<{ items: QuestionBankItem[]; total: number; skip: number; take: number }>('/question-bank', { params })
      .then((response) => response.data),

  subjects: () => api.get<string[]>('/question-bank/subjects').then((response) => response.data),
  grades: () => api.get<string[]>('/question-bank/grades').then((response) => response.data),
  topics: () => api.get<string[]>('/question-bank/topics').then((response) => response.data),

  select: (input: {
    questionIds: number[];
    title: string;
    description?: string;
    dueDate?: string;
    isPublished?: boolean;
    notifyParents?: boolean;
  }) => api.post('/question-bank/select', input).then((response) => response.data),
};
