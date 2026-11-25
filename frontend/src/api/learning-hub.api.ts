import { api } from "./axios";
export interface RecoveryTopic {
  topic: string;
  diagnosticReady: boolean;
  resources: {
    id: string;
    topic: string;
    type: string;
    questionCount: number;
    href: string;
  }[];
}
export interface RecoverySubject {
  subject: string;
  baseline: number | null;
  current: number | null;
  stage: string;
  priority: number;
  reviewDue: boolean;
  needsSupport: boolean;
  nextReviewAt: string | null;
  latest: { score: number; at: string; source: string } | null;
  topics: RecoveryTopic[];
}
export interface RecoveryQueue {
  queue: RecoverySubject[];
  generatedAt: string;
  notice: string;
  signalCount: number;
}
export interface EngagementEvent {
  at: string;
  kind: string;
  title: string;
  subject: string | null;
  score: number | null;
}
export interface EngagementReport {
  student: {
    name: string;
    grade: string | null;
    admissionNumber: string | null;
    school: { name: string };
  };
  period: { from: string; to: string; days: number; timezone: string };
  summary: {
    logins: number;
    lastLogin: string | null;
    activeDays: number;
    subjects: number;
    activities: number;
    average: number | null;
    timetableCompleted: number;
    timetableTotal: number;
  };
  subjectScores: { subject: string; count: number; average: number | null }[];
  daily: { date: string; count: number }[];
  events: EngagementEvent[];
  notes: string;
}
export const learningHubApi = {
  recovery: () =>
    api.get<RecoveryQueue>("/learning-coach/recovery").then((r) => {
      if (!Array.isArray(r.data?.queue))
        throw new Error("Recovery API is not ready. Please retry shortly.");
      return r.data;
    }),
  report: (days: number) =>
    api
      .get<EngagementReport>("/learning-coach/engagement", { params: { days } })
      .then((r) => r.data),
  pdf: (days: number) =>
    api
      .get("/learning-coach/engagement.pdf", {
        params: { days },
        responseType: "blob",
      })
      .then((r) => r.data as Blob),
};
