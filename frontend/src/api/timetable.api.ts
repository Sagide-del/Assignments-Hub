import { api } from "./axios";
export interface TimetableBlock {
  id: string;
  start: string;
  end: string;
  subject: string;
  topic: string;
  technique: string;
  activity_type: "STUDY" | "RECALL" | "BREAK" | "REWARD";
  quiz_link: string | null;
  activity: string;
  focus_zone: boolean;
  study_block_id?: string;
  module_id?: string;
  recall_prompts?: string[];
  review?: { due_date: string; offset_days: number };
  school_commitment?: boolean;
}
export interface TimetablePlan {
  version: 1;
  revision: string;
  week_start: string;
  timezone: string;
  source: "AI" | "TEMPLATE";
  quote: string;
  days: {
    day: string;
    date: string;
    window: { start: string; end: string };
    blocks: TimetableBlock[];
  }[];
  focus_subjects: {
    subject: string;
    percentage: number | null;
    weak: boolean;
    sources: string[];
  }[];
  warnings: string[];
  completed_block_ids: string[];
  next_week_reviews: {
    subject: string;
    topic: string;
    due_date: string;
    offset_days: number;
  }[];
  school_schedule_applied: boolean;
}
export interface Timetable {
  id: string;
  week_start: string;
  generated_at: string;
  generating: boolean;
  plan: TimetablePlan | null;
  progress: { completed: number; total: number };
  generation_count: number;
}
export interface TimetableResponse {
  timetable: Timetable | null;
  history: { id: string; week_start: string; generated_at: string }[];
  student: {
    id: number;
    name: string;
    grade: string;
    admission_number: string | null;
    pathway: string | null;
    school: { name: string; logo_url: string | null };
    independent: boolean;
  };
  week_start: string;
}
export interface RecallQuiz {
  revision: string;
  subject: string;
  topic: string;
  questions: {
    question_index: number;
    question_text: string;
    options: string[];
    illustration: unknown;
  }[];
  result: { score: number; total: number; completed_at: string } | null;
}
export interface RecallResult {
  score: number;
  total: number;
  results: {
    question_index: number;
    correct: boolean;
    correct_answer: string;
    explanation: string;
  }[];
}
export const timetableApi = {
  current: () =>
    api.get<TimetableResponse>("/study-hub/timetable").then((r) => r.data),
  get: (id: string) =>
    api.get<Timetable>(`/study-hub/timetable/${id}`).then((r) => r.data),
  generate: (regenerate: boolean) =>
    api
      .post<Timetable>(
        "/study-hub/timetable/generate",
        { regenerate },
        { timeout: 120000 },
      )
      .then((r) => r.data),
  complete: (
    id: string,
    block_id: string,
    completed: boolean,
    revision: string,
  ) =>
    api
      .patch<Timetable>(`/study-hub/timetable/${id}/progress`, {
        block_id,
        completed,
        revision,
      })
      .then((r) => r.data),
  pdf: (id: string) =>
    api
      .get(`/study-hub/timetable/${id}/pdf`, {
        responseType: "blob",
        timeout: 120000,
      })
      .then((r) => r.data as Blob),
  quiz: (id: string, blockId: string) =>
    api
      .get<RecallQuiz>(`/study-hub/timetable/${id}/quiz/${blockId}`)
      .then((r) => r.data),
  submitQuiz: (
    id: string,
    blockId: string,
    revision: string,
    answers: { question_index: number; answer: string }[],
  ) =>
    api
      .post<RecallResult>(`/study-hub/timetable/${id}/quiz/${blockId}`, {
        revision,
        answers,
      })
      .then((r) => r.data),
};
export function saveTimetable(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
