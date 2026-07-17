import { api } from './axios';
import type { Pathway, Track, StudentPathwaySelection, PathwayRecommendation } from '../types';

// Matches backend/src/pathways/pathways.controller.ts and
// pathways-report.controller.ts.
export const pathwaysApi = {
  findAllPathways: () => api.get<Pathway[]>('/pathways').then((r) => r.data),
  findTrack: (id: number) => api.get<Track>(`/pathways/tracks/${id}`).then((r) => r.data),

  recommend: (dto: { subjectGrades?: { subject: string; grade: string }[]; interests?: string[] }) =>
    api.post<PathwayRecommendation[]>('/pathways/recommendations', dto).then((r) => r.data),

  selectTrack: (dto: { trackId: number; notes?: string; source?: 'MANUAL' | 'RECOMMENDATION' }) =>
    api.post<StudentPathwaySelection>('/pathways/selections', dto).then((r) => r.data),

  updateActiveNotes: (notes: string) =>
    api.patch<StudentPathwaySelection>('/pathways/selections/current', { notes }).then((r) => r.data),

  findSelections: (params?: { studentId?: number; schoolId?: number; grade?: string; includeHistory?: boolean }) =>
    api.get<StudentPathwaySelection[]>('/pathways/selections', { params }).then((r) => r.data),

  getStats: (schoolId?: number) => api.get('/pathways/selections/stats', { params: { schoolId } }).then((r) => r.data),

  getStudentSummary: (studentId: number) =>
    api.get(`/pathways/selections/${studentId}/summary`).then((r) => r.data),

  // Streams a PDF — open in a new tab / trigger a download rather than
  // parsing as JSON.
  reportDownloadUrl: (studentId: number) => `/pathways/selections/${studentId}/report`,

  downloadReport: (studentId: number) =>
    api.get(`/pathways/selections/${studentId}/report`, { responseType: 'blob' }).then((r) => r.data as Blob),
};
