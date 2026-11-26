import { api } from "./axios";
export interface Stream {
  id: string;
  grade: string;
  name: string;
}
export interface Period {
  id: string;
  stream_id: string;
  stream: Stream;
  term: string;
  year: number;
  subjects: string[];
  status: string;
  revision: number;
}
export interface Band {
  min: number;
  code: string;
  label: string;
}
export interface Policy {
  bands: Band[];
  confirmed: boolean;
  version: number;
}
export interface Pupil {
  id: number;
  name: string;
  admissionNumber: string | null;
  elective_subjects: string[];
}
export interface Mark {
  updated_at?: string;
  id: string;
  student_id: number;
  score: number | null;
  remark: string | null;
  remark_suggestion: string | null;
}
export interface Assessment {
  id: string;
  subject: string;
  assessment_name: string;
  max_score: number;
  weight: number;
  records: Mark[];
}
export interface Options {
  admin: boolean;
  pairs: { subject: string; stream_id: string; stream: Stream }[];
  classes: {
    teacher_id: number;
    stream_id: string;
    stream: Stream;
    teacher: { id: number; name: string; email: string };
  }[];
  streams: Stream[];
  periods: Period[];
  teachers: { id: number; name: string; email: string }[];
}
export interface SubjectResult {
  subject: string;
  score: number | null;
  grade: string;
  complete: boolean;
  remark: string;
  assessments: {
    assessment: string;
    score: number | null;
    max_score: number;
    weight: number;
  }[];
}
export interface Matrix {
  period: Period;
  policy: Policy;
  rows: {
    student: Pupil;
    subjects: SubjectResult[];
    complete: boolean;
    total: number | null;
    average: number | null;
    setup_required: boolean;
  }[];
}
export interface ReportCard {
  id: string;
  student_id: number;
  revision: number;
  status: string;
  subjects_json: SubjectResult[];
  student_json: {
    name: string;
    grade: string;
    stream: string;
    admissionNumber: string | null;
  };
  school_json: {
    name: string;
    address: string | null;
    logoUrl?: string | null;
    phone?: string | null;
    contactEmail?: string | null;
    principalName?: string | null;
    principalSignatureUrl?: string | null;
    schoolClosesOn?: string | null;
    schoolClosesTime?: string | null;
    schoolOpensOn?: string | null;
    schoolOpensTime?: string | null;
  };
  policy_json: { bands: Band[]; confirmed: boolean };
  total_score: number | null;
  average_score: number | null;
  class_position: number | null;
  cohort_size: number | null;
  complete: boolean;
  teacher_comment: string | null;
  principal_comment: string | null;
  period?: { term: string; year: number };
  published_at: string | null;
}
export interface ReportBookSettings {
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  contactEmail: string | null;
  principal_name: string | null;
  principal_signature_url: string | null;
  school_closes_on: string | null;
  school_closes_time: string | null;
  school_opens_on: string | null;
  school_opens_time: string | null;
}
export const reportBookApi = {
  options: () => api.get<Options>("/report-book/options").then((r) => r.data),
  settings: () =>
    api.get<ReportBookSettings>("/report-book/settings").then((r) => r.data),
  saveSettings: (data: ReportBookSettings) =>
    api.post("/report-book/settings", data).then((r) => r.data),
  policy: (grade: number) =>
    api.get<Policy>(`/report-book/policy/${grade}`).then((r) => r.data),
  savePolicy: (grade_level: number, bands: Band[], confirmed: boolean) =>
    api.post("/report-book/policy", { grade_level, bands, confirmed }),
  createPeriod: (data: {
    stream_id: string;
    term: string;
    year: number;
    subjects: string[];
  }) => api.post("/report-book/periods", data),
  updateSubjects: (id: string, subjects: string[]) =>
    api.post(`/report-book/periods/${id}/subjects`, { subjects }),
  assignClass: (stream_id: string, teacher_id: number) =>
    api.post("/report-book/class-teachers", { stream_id, teacher_id }),
  gradebook: (id: string, subject: string) =>
    api
      .get<{
        period: Period;
        subject: string;
        policy: Policy;
        students: Pupil[];
        assessments: Assessment[];
      }>(`/report-book/periods/${id}/gradebook`, { params: { subject } })
      .then((r) => r.data),
  save: (data: {
    period_id: string;
    subject: string;
    assessment_name: string;
    max_score: number;
    weight: number;
    scores: {
      student_id: number;
      score: number | null;
      remark?: string;
      expected_updated_at?: string;
    }[];
  }) => api.post("/report-book/gradebook/bulk-save", data).then((r) => r.data),
  suggest: (assessment_id: string, record_ids: string[]) =>
    api
      .post(
        "/report-book/gradebook/generate-comments",
        { assessment_id, record_ids },
        { timeout: 45000 },
      )
      .then((r) => r.data),
  matrix: (id: string) =>
    api
      .get<Matrix>(`/report-book/periods/${id}/aggregated`)
      .then((r) => r.data),
  generate: (id: string, rank: boolean) =>
    api
      .post<{ generated: number; incomplete: number; revision: number }>(
        `/report-book/periods/${id}/generate`,
        { rank },
      )
      .then((r) => r.data),
  cards: (id: string, revision?: number) =>
    api
      .get<ReportCard[]>(`/report-book/periods/${id}/reports`, {
        params: revision ? { revision } : {},
      })
      .then((r) => r.data),
  comments: (
    id: string,
    data: { teacher_comment?: string; principal_comment?: string },
  ) => api.post(`/report-book/reports/${id}/comments`, data),
  transition: (
    id: string,
    action: "review" | "publish" | "reopen",
    reason?: string,
  ) =>
    api.post(`/report-book/periods/${id}/${action}`, reason ? { reason } : {}),
  mine: () =>
    api.get<ReportCard[]>("/report-book/my-reports").then((r) => r.data),
  history: (id: string) =>
    api
      .get<
        {
          id: string;
          action: string;
          actor_id: number;
          actor_name?: string;
          student_name?: string | null;
          created_at: string;
          details: unknown;
        }[]
      >(`/report-book/periods/${id}/history`)
      .then((r) => r.data),
  pdf: async (id: string) => {
    const r = await api.get(`/report-book/reports/${id}/pdf`, {
      responseType: "blob",
    });
    const url = URL.createObjectURL(r.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `school-report-${id}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  },
};
