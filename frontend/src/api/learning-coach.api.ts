import { api } from './axios';

export type LearningCoachMode = 'DIAGNOSTIC' | 'PRACTICE';

export interface LearningTopic {
  subject: string;
  topic: string;
  questionCount: number;
}

export interface LearningPlanStep {
  order: number;
  title: string;
  minutes: number;
  technique: string;
}

export interface LearningPlan {
  id: number;
  subject: string;
  grade: string;
  topic: string;
  masteryScore: number;
  lastDiagnosticScore: number | null;
  lowPerformanceStreak: number;
  nextReviewAt: string | null;
  requiresHumanSupport: boolean;
  recommendedTechnique: string;
  focusAreas: string[];
  plan: LearningPlanStep[];
  updatedAt: string;
}

export interface LearningQuestion {
  id: number;
  questionText: string;
  contentHtml: string | null;
  questionType: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FILL_BLANK' | 'NUMERIC' | 'SHORT_ANSWER';
  options: string[] | null;
  hint: string | null;
  points: number;
  diagramUrl: string | null;
  diagramAlt: string | null;
  sourceTitle: string | null;
}

export interface LearningSession {
  session: { id: number; mode: LearningCoachMode; total: number };
  plan: LearningPlan;
  lesson: {
    objective: string;
    workedExample: string;
    modelAnswer: string;
    explanation: string;
    reflectionPrompt: string;
    diagramUrl: string | null;
    diagramAlt: string | null;
    sourceTitle: string | null;
  };
  questions: LearningQuestion[];
}

export interface LearningAnswerFeedback {
  isCorrect: boolean;
  feedback: string;
  answered: number;
  total: number;
  completed: boolean;
  score?: number;
  plan?: LearningPlan;
}

export const learningCoachApi = {
  catalog: () => api.get<LearningTopic[]>('/learning-coach/catalog').then((response) => response.data),
  plans: () => api.get<LearningPlan[]>('/learning-coach/plans').then((response) => response.data),
  start: (input: { subject: string; topic: string; mode?: LearningCoachMode }) =>
    api.post<LearningSession>('/learning-coach/sessions', input).then((response) => response.data),
  answer: (sessionId: number, input: { questionId: number; answer: string }) =>
    api.post<LearningAnswerFeedback>(`/learning-coach/sessions/${sessionId}/answers`, input).then((response) => response.data),
};
