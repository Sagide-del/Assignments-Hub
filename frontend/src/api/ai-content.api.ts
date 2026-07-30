import { api } from './axios';

export type AiJobStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED';

export type AiArtifactStatus =
  | 'GENERATED'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PUBLISHED'
  | 'ARCHIVED';

export type AiQuestionType =
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE'
  | 'NUMERIC'
  | 'SHORT_ANSWER'
  | 'ESSAY';

export interface AiSubtopic {
  id: string;
  name: string;
  keyConcepts: string[];
  sourceContent: string;
}

export interface AiTopic {
  id: string;
  name: string;
  summary: string;
  sourceContent: string;
  subtopics: AiSubtopic[];
  extractedContentId: number;
  subject: string;
  grade: string | null;
  fileName: string;
}

export interface AiPdfContent {
  id: number;
  fileName: string;
  subject: string;
  grade: string | null;
  topicCount: number;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  error: string | null;
  content: { topics: Omit<AiTopic, 'extractedContentId' | 'subject' | 'grade' | 'fileName'>[] };
  createdAt: string;
  processedAt: string | null;
}

export interface AiGeneratedQuestion {
  questionText: string;
  questionType: AiQuestionType;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  points: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  hint?: string;
  contentHtml?: string;
}

export interface AiArtifactContent {
  title: string;
  description?: string;
  subject: string;
  grade: string;
  topicName: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED';
  questions: AiGeneratedQuestion[];
}

export interface AiArtifact {
  id: number;
  schoolId: number;
  generationJobId: number;
  type: string;
  status: AiArtifactStatus;
  version: number;
  content: AiArtifactContent;
  publishedAssignmentId: number | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface AiGeneration {
  id: number;
  status: AiJobStatus;
  model: string | null;
  totalTokens?: number | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  extractedContent: {
    id: number;
    fileName: string;
    subject: string;
    grade: string | null;
  } | null;
  artifacts: {
    id: number;
    status: AiArtifactStatus;
    version: number;
    publishedAssignmentId: number | null;
  }[];
  school: { id: number; name: string; code: string };
  requestedBy: { id: number; name: string; role: string };
}

export interface AiQuota {
  feature: string;
  periodStart: string;
  resetsAt: string;
  limit: number | null;
  used: number;
  succeeded: number;
  failed: number;
  remaining: number | null;
}

export interface AiFeatureConfig {
  id: string;
  configId: number | null;
  school: {
    id: number;
    name: string;
    code: string;
    subscriptionStatus: string;
  };
  feature: string;
  configuredEnabled: boolean;
  effectiveEnabled: boolean;
  globallyEnabled: boolean;
  previewOnly: boolean;
  monthlyRequestLimit: number | null;
  updatedAt: string | null;
}

export interface AiMonitoring {
  period: { from: string; to: string };
  jobs: {
    total: number;
    byStatus: Record<AiJobStatus, number>;
    failureRatePercent: number;
    averageGenerationSeconds: number | null;
  };
  extractions: Record<string, number>;
  artifacts: Record<string, number>;
  usage: {
    successfulProviderCalls: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  topSchools: {
    school: { id: number; name: string; code: string };
    jobs: number;
  }[];
  recentJobs: AiGeneration[];
}

function idempotencyKey() {
  return crypto.randomUUID();
}

export const aiContentApi = {
  uploadPdf: (input: { file: File; subject: string; grade?: string }) => {
    const body = new FormData();
    body.append('file', input.file);
    body.append('subject', input.subject);
    if (input.grade) body.append('grade', input.grade);
    return api
      .post<{
        id: number;
        status: AiPdfContent['status'];
        fileName: string;
        subject: string;
        grade: string | null;
        topicCount: number;
        createdAt: string;
      }>('/ai/pdf/upload', body, {
        headers: { 'Idempotency-Key': idempotencyKey() },
      })
      .then((response) => response.data);
  },

  getPdfContent: (id: number) =>
    api.get<AiPdfContent>(`/ai/pdf/${id}/content`).then((response) => response.data),

  listTopics: (params?: { subject?: string; grade?: string; skip?: number; take?: number }) =>
    api
      .get<{ items: AiTopic[]; total: number; skip: number; take: number }>('/ai/topics', { params })
      .then((response) => response.data),

  generate: (input: {
    topicId: string;
    subtopicIds?: string[];
    questionCount: number;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED';
    questionTypes: AiQuestionType[];
  }) =>
    api
      .post<{ jobId: number; status: AiJobStatus; createdAt: string }>('/ai/assignments/generate', input, {
        headers: { 'Idempotency-Key': idempotencyKey() },
      })
      .then((response) => response.data),

  listGenerations: (params?: { status?: AiJobStatus; skip?: number; take?: number; schoolId?: number }) =>
    api
      .get<{ items: AiGeneration[]; total: number; skip: number; take: number }>(
        '/ai/assignments/generations',
        { params },
      )
      .then((response) => response.data),

  getArtifact: (id: number) =>
    api.get<AiArtifact>(`/ai/assignments/${id}`).then((response) => response.data),

  editArtifact: (id: number, content: AiArtifactContent) =>
    api.patch<AiArtifact>(`/ai/assignments/${id}/edit`, { content }).then((response) => response.data),

  approveArtifact: (id: number, notes?: string) =>
    api.post<AiArtifact>(`/ai/assignments/${id}/approve`, { notes }).then((response) => response.data),

  publishArtifact: (id: number, publishNow: boolean) =>
    api
      .post<{
        assignmentId: number;
        assignment: { id: number; isPublished: boolean };
        artifact: AiArtifact;
      }>(`/ai/assignments/${id}/publish`, { publishNow })
      .then((response) => response.data),

  rejectArtifact: (id: number, notes: string) =>
    api.post<AiArtifact>(`/ai/assignments/${id}/reject`, { notes }).then((response) => response.data),

  getQuota: () => api.get<AiQuota>('/ai/quotas').then((response) => response.data),

  getAdminFeatures: (schoolId?: number) =>
    api
      .get<AiFeatureConfig[]>('/ai/admin/features', { params: { schoolId } })
      .then((response) => response.data),

  updateAdminFeature: (
    id: string,
    update: {
      enabled?: boolean;
      previewOnly?: boolean;
      monthlyRequestLimit?: number;
    },
  ) =>
    api
      .patch(`/ai/admin/features/${encodeURIComponent(id)}`, update)
      .then((response) => response.data),

  getMonitoring: () =>
    api.get<AiMonitoring>('/ai/admin/monitoring').then((response) => response.data),
};
