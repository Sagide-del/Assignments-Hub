import { api } from "./axios";
export type MockVisual =
  | { kind: "table"; caption: string; headings: string[]; rows: string[][] }
  | { kind: "rectangle"; width: number; height: number }
  | { kind: "triangle"; base: number; height: number }
  | { kind: "circle"; radius: number }
  | { kind: "angles"; known: number }
  | { kind: "point"; x: number; y: number }
  | { kind: "bars"; labels: string[]; values: number[] };
export type MockAnswer =
  number | { responses: Record<string, string>; working: string };
export interface MockQuestion {
  manualSelfReview?: boolean;
  section?: string;
  marks?: number;
  responseType?: "CHOICE" | "STRUCTURED";
  passage?: { title: string; text: string };
  parts?: {
    id: string;
    prompt: string;
    marks: number;
    answer?: string;
    answerType?: "NUMERIC" | "TEXT";
  }[];
  awardedMarks?: number;
  contentHtml?: string;
  diagramUrl?: string;
  diagramAlt?: string;
  sourceGrade?: string;
  id: string;
  topicId: string;
  topic: string;
  area: string;
  prompt: string;
  options: string[];
  visual?: MockVisual;
  correctIndex?: number;
  explanation?: string;
}
export interface MockSubject {
  contentKind?: "VARIED" | "STARTER" | "BANK";
  id: string;
  subject: string;
  source: "GENERATED" | "BANK";
  availableCount: number | null;
  fullPaperReady?: boolean;
  totalMarks?: number;
  durationMinutes?: number;
  sections?: string[];
  questionCount: number;
  topicCount: number;
  visualCount: number | null;
  grades: string[];
}
export interface MockSummary {
  subject: string;
  source: "GENERATED" | "BANK" | "PRACTICE";
  coverage: {
    topic?: string;
    totalMarks?: number;
    questionCount: number;
    topicCount: number;
    visualCount: number;
    grades: string[];
  };
  id: string;
  status: "DRAFT" | "SUBMITTED";
  score: number | null;
  timeLimitMinutes: number | null;
  createdAt: string;
  completedAt: string | null;
  version: string;
  questionCount: number;
}
export interface MockAttempt extends Omit<MockSummary, "questionCount"> {
  totalMarks?: number;
  performance?: {
    code: string;
    label: string;
    percent: number;
    points: number;
    practiceEstimate: true;
  } | null;
  deadline: string | null;
  serverNow: string;
  answers: Record<string, MockAnswer>;
  questions: MockQuestion[];
}
export interface MockBlueprint {
  version: string;
  subject: string;
  level: string;
  questionCount: number;
  topicCount: number;
  areaCount: number;
  visualCount: number;
  areas: string[];
  topics: { id: string; name: string; area: string; visual: boolean }[];
  sourceNote: string;
}
const payload = (answers: Record<string, MockAnswer>) => ({
  answers: Object.entries(answers).map(([questionId, answer]) =>
    typeof answer === "number"
      ? { questionId, option: answer }
      : { questionId, responses: answer.responses, working: answer.working },
  ),
});
export const kjseaApi = {
  blueprint: () =>
    api.get<MockBlueprint>("/kjsea/blueprint").then((r) => r.data),
  list: () => api.get<MockSummary[]>("/kjsea/attempts").then((r) => r.data),
  subjects: (grade?: string) =>
    api
      .get<MockSubject[]>("/kjsea/subjects", { params: { grade } })
      .then((r) => r.data),
  create: (
    timeLimitMinutes?: number,
    subject = "Mathematics",
    source: "GENERATED" | "BANK" = "GENERATED",
    grade?: string,
  ) =>
    api
      .post<MockAttempt>(
        "/kjsea/attempts",
        {
          timeLimitMinutes,
          subject,
          source,
          grade,
        },
        { timeout: 30000 },
      )
      .then((r) => r.data),
  get: (id: string) =>
    api
      .get<MockAttempt>(`/kjsea/attempts/${encodeURIComponent(id)}`)
      .then((r) => r.data),
  save: (id: string, answers: Record<string, MockAnswer>) =>
    api
      .patch<MockAttempt>(
        `/kjsea/attempts/${encodeURIComponent(id)}`,
        payload(answers),
        { timeout: 15000 },
      )
      .then((r) => r.data),
  submit: (id: string, answers: Record<string, MockAnswer>) =>
    api
      .post<MockAttempt>(
        `/kjsea/attempts/${encodeURIComponent(id)}/submit`,
        payload(answers),
        { timeout: 30000 },
      )
      .then((r) => r.data),
  discard: (id: string) =>
    api.delete(`/kjsea/attempts/${encodeURIComponent(id)}`).then((r) => r.data),
};
