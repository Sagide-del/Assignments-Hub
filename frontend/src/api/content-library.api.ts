import { api } from "./axios";
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
  };
  result?: { count?: number; sourceId?: number };
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
}
export const contentLibraryApi = {
  overview: () =>
    api
      .get<{
        version: number;
        coverage: Coverage[];
        jobs: LibraryJob[];
        sources: LibrarySource[];
      }>("/admin/content-library")
      .then((r) => r.data),
  discover: (file?: File) => {
    const body = new FormData();
    if (file) body.append("file", file);
    return api
      .post<{
        candidates: Candidate[];
        errors: { url: string; message: string }[];
      }>("/admin/content-library/discover", body, { timeout: 180000 })
      .then((r) => r.data);
  },
  imports: (sources: { url: string; subject: string; grade: string }[]) =>
    api.post("/admin/content-library/import", { sources }).then((r) => r.data),
  generate: (
    sourceIds: number[],
    kind: "QUESTIONS" | "CARDS",
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
export interface RecallContent {
  version: 1;
  cue: string;
  mnemonic: string;
  explanation: string;
  facts: { label: string; meaning: string }[];
  checks: { question: string; answer: string }[];
  sourceIds: number[];
}
