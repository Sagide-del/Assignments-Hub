import { api } from "./axios";
export interface SubjectQueueProgress {
  grade: string;
  subject: string;
  queued: number;
  running: number;
  completed: number;
  failed: number;
  skipped: number;
}
export interface LibraryJob {
  id: string;
  kind: string;
  status: string;
  input: {
    grade?: string;
    subject?: string;
    topic?: string;
    count?: number;
    url?: string;
    audience?: "INDEPENDENT" | "SCHOOLS" | "BOTH";
    schoolIds?: number[];
  };
  result?: {
    count?: number;
    reusedJobId?: string;
    sourceId?: number;
    assignmentsCreated?: number;
    questionCopies?: number;
    independentPublished?: boolean;
    schoolCount?: number;
    alreadyPublished?: number;
    processed?: number;
    total?: number;
    subjects?: { subject: string }[];
    failures?: { subject?: string; schoolId?: number; error: string }[];
  };
  error?: string;
  createdAt: string;
}
export interface LibrarySource {
  id: number;
  title: string;
  subject: string;
  grade: string;
  fileName: string | null;
  _count: { chunks: number; questions: number };
}
export interface Coverage {
  grade: string;
  subject: string;
  status: string;
  _count: { _all: number };
}
export interface Candidate {
  url: string;
  title: string;
  grade: string | null;
  pdf: boolean;
  subject?: string;
  issue?: string;
}
export const contentLibraryApi = {
  overview: () =>
    api
      .get<{
        version: number;
        queue?: { concurrency: number; subjects: SubjectQueueProgress[] };
        coverage: Coverage[];
        jobs: LibraryJob[];
        sources: LibrarySource[];
      }>("/admin/content-library")
      .then((r) => r.data),
  discover: (file?: File, grades?: string[]) => {
    const body = new FormData();
    if (file) body.append("file", file);
    if (grades) body.append("grades", JSON.stringify(grades));
    return api
      .post<{
        candidates: Candidate[];
        errors: { url: string; message: string; grade?: string }[];
      }>("/admin/content-library/discover", body, { timeout: 180000 })
      .then((r) => r.data);
  },
  imports: (sources: { url: string; subject: string; grade: string }[]) =>
    api
      .post<{ queued: number; skipped: number }>(
        "/admin/content-library/import",
        { sources },
      )
      .then((r) => r.data),
  generate: (
    sourceIds: number[],
    kind: "QUESTIONS" | "CARDS" | "BOTH",
    count: number,
    topic?: string,
  ) =>
    api
      .post("/admin/content-library/generate", {
        sourceIds,
        kind,
        count,
        topic: topic || undefined,
      })
      .then((r) => r.data),
  retry: (id: string) =>
    api.post(`/admin/content-library/jobs/${id}/retry`).then((r) => r.data),
};
export interface RecallVisual {
  kind:
    | "diagram"
    | "concept-map"
    | "process"
    | "comparison"
    | "timeline"
    | "fraction";
  title: string;
  template?: "heart" | "lungs" | "plant-cell" | "circuit";
  scene?: "water" | "weeds" | "crop-yield" | "none";
  labels?: { label: string; detail: string; icon?: string }[];
  numerator?: number;
  denominator?: number;
}
export interface RecallContent {
  visual?: RecallVisual;
  version: 1;
  cue: string;
  mnemonic: string;
  explanation: string;
  facts: { label: string; meaning: string }[];
  checks: { question: string; answer: string }[];
  sourceIds: number[];
}
