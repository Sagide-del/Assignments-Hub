import { api } from './axios';

// Matches backend/src/reports/reports.controller.ts.
// Existing reports remain loosely typed because their aggregate shapes
// are not formally documented. AI usage has a documented response shape,
// so it is typed below.

export interface AiUsageReport {
  type: string;
  generatedAt: string;
  scope: string;

  currentMonthUsage?: number;
  quotaLimit?: number | null;
  remaining?: number | null;
  successfulGenerations?: number;

  totalRequests?: number;
  successfulRequests?: number;
  failedRequests?: number;

  providerBreakdown?: {
    provider: string;
    count: number;
  }[];

  topSchools?: {
    schoolId: number;
    schoolName?: string;
    usage: number;
  }[];

  [key: string]: unknown;
}

export const reportsApi = {
  users: (schoolId?: number) =>
    api.get('/reports/users', { params: { schoolId } }).then((r) => r.data),

  assignments: (schoolId?: number) =>
    api.get('/reports/assignments', { params: { schoolId } }).then((r) => r.data),

  labs: (schoolId?: number) =>
    api.get('/reports/labs', { params: { schoolId } }).then((r) => r.data),

  financial: (schoolId?: number) =>
    api.get('/reports/financial', { params: { schoolId } }).then((r) => r.data),

  studentReportCard: (studentId: number) =>
    api.get(`/reports/student/${studentId}`).then((r) => r.data),

  // AI usage analytics
  // Backend:
  // GET /api/v1/reports/ai-usage
  //
  // School Admin:
  // returns school-scoped usage + quota information.
  //
  // Platform Admin:
  // returns platform-wide AI analytics.
  aiUsage: (schoolId?: number) =>
    api
      .get<AiUsageReport>('/reports/ai-usage', {
        params: { schoolId },
      })
      .then((r) => r.data),
};