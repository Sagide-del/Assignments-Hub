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
  className: string | null;
  stream: string | null;
  score: number;
  percentage: number;
  timeSpentSeconds: number | null;
  isLate: boolean;
}

export interface AssignmentAnalytics {
  assignmentId: number;
  assignmentTitle: string;
  targetClass: string | null;
  targetStream: string | null;
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
  streamPerformance: Array<{
    stream: string;
    studentCount: number;
    averagePercentage: number;
    passRate: number;
  }>;
}

// Matches backend/src/analytics/analytics.controller.ts.
export const analyticsApi = {
  assignment: (assignmentId: number) =>
    api.get<AssignmentAnalytics>(`/analytics/assignment/${assignmentId}`).then((r) => r.data),
};
