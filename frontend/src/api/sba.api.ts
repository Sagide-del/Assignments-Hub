import { api } from "./axios";
export interface SbaRecord {
  id: string;
  subject: string;
  grade_level: number;
  term: string;
  academic_year: number;
  score: number;
  updated_at: string;
}
export interface SbaRow {
  student_id: number;
  name: string;
  admission_number: string | null;
  grade: string;
  stream: string | null;
  pathway: string | null;
  track: string | null;
  grade10_sba: number | null;
  grade11_sba: number | null;
  internal_mock: number | null;
  external_mock: number | null;
  kcbe_mock: number | null;
  projected: number | null;
  predicted_grade: string | null;
  evidence_components: number;
  mock_attempt_count: number;
  records: SbaRecord[];
}
export interface SbaReport {
  rows: SbaRow[];
  summary: {
    students: number;
    complete: number;
    average_projected: number | null;
    below50: number;
    top_performers: number;
  };
  projection_note: string;
  teaching_class?: {
    id: string;
    subject: string;
    grade: string;
    stream: string;
  };
}
export const sbaApi = {
  school: (id: number) =>
    api.get<SbaReport>(`/sba/school/${id}`).then((r) => r.data),
  teaching: (id: string) =>
    api.get<SbaReport>(`/sba/teaching/${id}`).then((r) => r.data),
  record: (input: {
    student_id: number;
    subject: string;
    grade_level: number;
    term: string;
    score: number;
    academic_year: number;
  }) => api.post("/sba/record", input).then((r) => r.data),
  csv: (id: number, filters: Record<string, string>) =>
    api
      .get(`/sba/school/${id}/export`, {
        params: filters,
        responseType: "blob",
      })
      .then((r) => r.data as Blob),
};

export interface MockImportSummary {
  total_rows: number;
  imported: number;
  failed: number;
  skipped: number;
  inserted: number;
  updated: number;
  unchanged: number;
  errors: { row: number; admission_number: string; message: string }[];
  merge: { students: number; complete: number } | null;
}
export const sbaImportApi = {
  template: () =>
    api
      .get("/sba/import/template", { responseType: "blob" })
      .then((r) => r.data as Blob),
  upload: (file: File, source: string, academicYear: number) => {
    const form = new FormData();
    form.append("file", file);
    form.append("source", source);
    form.append("academic_year", String(academicYear));
    return api
      .post<MockImportSummary>("/sba/import/upload", form, { timeout: 120000 })
      .then((r) => r.data);
  },
  merge: () =>
    api
      .post<{ students: number; complete: number }>(
        "/sba/import/merge",
        {},
        { timeout: 120000 },
      )
      .then((r) => r.data),
};
