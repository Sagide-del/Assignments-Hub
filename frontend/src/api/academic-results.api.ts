import { api } from './axios';

export interface AcademicResultBatch {
  id: number;
  name: string;
  academicYear: number;
  term: string;
  grade: string;
  className: string | null;
  stream: string | null;
  rowCount: number;
  status: string;
  createdAt: string;
  school?: { name: string; code: string };
  _count?: { results: number };
}

export interface StudySession {
  day: string;
  startTime: string;
  durationMinutes: number;
  breakMinutes: number;
  subject: string;
  topic: string;
  subtopic: string;
  learningTechnique: string;
  activity: string;
}

export interface StudentStudyPlanResponse {
  plan: null | {
    id: number;
    periodKey: string;
    weakSubjects: Array<{ subject: string; percentage: number; priority: 'HIGH' | 'MEDIUM' }>;
    timetable: StudySession[];
    recommendations: Array<{ subject: string; currentPercentage: number; action: string; weeklySessions: number }>;
    updatedAt: string;
  };
  subjectTrends: Array<{ subject: string; latest: number; change: number; projectedNext: number; dataPoints: number }>;
  practiceAssignments: Array<{ id: number; title: string; subject: string; maxPoints: number; dueDate: string | null }>;
}

export interface AcademicAnalysis {
  batch: AcademicResultBatch;
  overview: { studentCount: number; resultCount: number; averagePercentage: number; belowThreshold: number };
  subjectPerformance: Array<{ subject: string; studentCount: number; averagePercentage: number; belowThreshold: number }>;
  learnersNeedingSupport: Array<{ studentId: number; studentName: string; admissionNumber: string | null; className: string | null; stream: string | null; subject: string; percentage: number }>;
  teachingActions: string[];
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export const academicResultsApi = {
  myPlan: () => api.get<StudentStudyPlanResponse>('/academic-results/me/plan').then((response) => response.data),
  batches: () => api.get<AcademicResultBatch[]>('/academic-results/batches').then((response) => response.data),
  analysis: (id: number) => api.get<AcademicAnalysis>(`/academic-results/batches/${id}/analysis`).then((response) => response.data),
  importResults: (payload: FormData) => api.post('/academic-results/import', payload, { headers: { 'Content-Type': 'multipart/form-data' } }).then((response) => response.data),
  downloadTemplate: async () => {
    const response = await api.get<Blob>('/academic-results/template', { responseType: 'blob' });
    downloadBlob(response.data, 'academic-results-template.xlsx');
  },
  downloadReport: async (id: number, name: string) => {
    const response = await api.get<Blob>(`/academic-results/batches/${id}/report.pdf`, { responseType: 'blob' });
    downloadBlob(response.data, `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-report.pdf`);
  },
};
