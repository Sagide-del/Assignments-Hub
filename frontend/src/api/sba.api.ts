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
