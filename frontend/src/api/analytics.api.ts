import { api } from './axios';

export interface QuestionPerformance {
  questionId: number;
  questionText: string;
  questionType: string;
  order: number;
  points: number;
  timesAnswered: number;
  timesGraded: number;
  percentCorrect: number | null;
  averagePointsAwarded: number;
  observedDifficulty: 'EASY' | 'MEDIUM' | 'HARD' | null;
  struggled: boolean;
}

export interface StudentPerformance {
  studentId: number;
  studentName: string;
  score: number;
  percentage: number;
  timeSpentSeconds: number | null;
  isLate: boolean;
}

export interface AssignmentAnalytics {
  assignmentId: number;
  assignmentTitle: string;
  maxPoints: number;
  overview: {
    totalSubmissions: number;
    gradedCount: number;
    pendingReviewCount: number;
    averageScore: number;
    averagePercentage: number;
    passRate: number;
    averageTimeSpentSeconds: number;
  };
  questionPerformance: QuestionPerformance[];
  studentPerformance: StudentPerformance[];
  strugglingStudents: StudentPerformance[];
  topPerformers: StudentPerformance[];
}

// Matches backend/src/analytics/analytics.controller.ts.
export const analyticsApi = {
  assignment: (assignmentId: number) =>
    api.get<AssignmentAnalytics>(`/analytics/assignment/${assignmentId}`).then((r) => r.data),
};
