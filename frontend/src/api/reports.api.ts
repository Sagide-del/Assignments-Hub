import { api } from './axios';

// Matches backend/src/reports/reports.controller.ts. Shapes are left as
// `unknown`-ish (loosely typed) deliberately — ReportsService's aggregates
// aren't documented field-by-field anywhere in the backend, so rendering
// code should defensively read fields rather than assume a strict contract.
export const reportsApi = {
  users: (schoolId?: number) => api.get('/reports/users', { params: { schoolId } }).then((r) => r.data),
  assignments: (schoolId?: number) => api.get('/reports/assignments', { params: { schoolId } }).then((r) => r.data),
  labs: (schoolId?: number) => api.get('/reports/labs', { params: { schoolId } }).then((r) => r.data),
  financial: (schoolId?: number) => api.get('/reports/financial', { params: { schoolId } }).then((r) => r.data),
  studentReportCard: (studentId: number) => api.get(`/reports/student/${studentId}`).then((r) => r.data),
};
