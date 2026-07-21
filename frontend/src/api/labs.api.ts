import { api } from './axios';
import type {
  AnswerInput,
  Lab,
  LabMedia,
  LabReflectionPrompt,
  LabSession,
  LabStep,
  StemCategory,
  StemSubject,
} from '../types';

// Matches backend/src/labs/labs.controller.ts and
// backend/src/lab-sessions/lab-sessions.controller.ts.
export const labsApi = {
  findAll: (grade?: string) => api.get<Lab[]>('/labs', { params: { grade } }).then((r) => r.data),
  findOne: (id: number) => api.get<Lab>(`/labs/${id}`).then((r) => r.data),
  findCms: (id: number) => api.get<Lab>(`/labs/${id}/cms`).then((r) => r.data),
  create: (dto: {
    key: string;
    title: string;
    category?: number;
    stemSubject?: number;
    subject: string;
    grade: string;
    topic?: string;
    topicArea?: string;
    competency?: string;
    pathway?: string;
    description?: string;
    durationMinutes?: number;
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    type?: 'SIMULATION' | 'PRACTICAL';
    resourceUrl?: string;
    introVideoUrl?: string;
    animationUrl?: string;
    voiceAudioUrl?: string;
    isPublished?: boolean;
    media?: Array<{
      type: string;
      title?: string;
      caption?: string;
      url: string;
      order?: number;
    }>;
    steps?: Array<{
      title: string;
      instruction: string;
      mediaUrl?: string;
      interactionType?: string;
      expectedOutcome?: string;
      order?: number;
    }>;
    reflectionPrompts?: Array<{
      prompt: string;
      order?: number;
    }>;
    completionReportTemplate?: {
      title?: string;
      summary?: string;
      outcomesJson?: unknown;
    };
  }) => api.post<Lab>('/labs', dto).then((r) => r.data),
  update: (
    id: number,
    dto: Partial<{
      title: string;
      category?: number;
      stemSubject?: number;
      subject: string;
      grade: string;
      topic?: string;
      topicArea?: string;
      competency?: string;
      pathway?: string;
      description?: string;
      durationMinutes?: number;
      status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
      type?: 'SIMULATION' | 'PRACTICAL';
      resourceUrl?: string;
      introVideoUrl?: string;
      animationUrl?: string;
      voiceAudioUrl?: string;
      isPublished?: boolean;
      media?: Array<{
        type: string;
        title?: string;
        caption?: string;
        url: string;
        order?: number;
      }>;
      steps?: Array<{
        title: string;
        instruction: string;
        mediaUrl?: string;
        interactionType?: string;
        expectedOutcome?: string;
        order?: number;
      }>;
      reflectionPrompts?: Array<{
        prompt: string;
        order?: number;
      }>;
      completionReportTemplate?: {
        title?: string;
        summary?: string;
        outcomesJson?: unknown;
      };
    }>,
  ) => api.patch<Lab>(`/labs/${id}`, dto).then((r) => r.data),
  remove: (id: number) => api.delete<{ deleted: true }>(`/labs/${id}`).then((r) => r.data),
  addMedia: (id: number, media: Array<Pick<LabMedia, 'type' | 'url' | 'title' | 'caption' | 'order'>>) =>
    api.post<Lab>(`/labs/${id}/media`, { media }).then((r) => r.data),
  addSteps: (
    id: number,
    steps: Array<Pick<LabStep, 'title' | 'instruction' | 'mediaUrl' | 'interactionType' | 'expectedOutcome' | 'order'>>,
  ) => api.post<Lab>(`/labs/${id}/steps`, { steps }).then((r) => r.data),
  addReflections: (id: number, reflectionPrompts: Array<Pick<LabReflectionPrompt, 'prompt' | 'order'>>) =>
    api.post<Lab>(`/labs/${id}/reflections`, { reflectionPrompts }).then((r) => r.data),
};

export const stemApi = {
  findCategories: () => api.get<StemCategory[]>('/stem/categories').then((r) => r.data),
  findSubjects: () => api.get<StemSubject[]>('/stem/subjects').then((r) => r.data),
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
