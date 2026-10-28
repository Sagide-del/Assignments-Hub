import { api } from "./axios";
import type {
  AiArtifactStatus,
  AiJobStatus,
  AiPdfContent,
} from "./ai-content.api";
export interface CurriculumDocument {
  id: number;
  fileName: string;
  subject: string;
  grade: string | null;
  status: AiPdfContent["status"];
  topicCount: number;
  error: string | null;
  createdAt: string;
}
export interface CurriculumUnit {
  id: string;
  topicId: string;
  strand: string;
  subStrand: string;
  outcomes: string[];
  sourceContent: string;
  status: AiJobStatus | "MISSING";
  jobId: number | null;
  error: string | null;
  artifacts: {
    id: number;
    status: AiArtifactStatus;
    publishedAssignmentId: number | null;
  }[];
}
export const curriculumApi = {
  documents: () =>
    api.get<CurriculumDocument[]>("/ai/curriculum").then((r) => r.data),
  coverage: (id: number) =>
    api
      .get<{ document: CurriculumDocument; units: CurriculumUnit[] }>(
        `/ai/curriculum/${id}`,
      )
      .then((r) => r.data),
  populate: (id: number, unitIds: string[], questionCount: number) =>
    api
      .post<{ results: { unitId: string; status: string; error?: string }[] }>(
        `/ai/curriculum/${id}/populate`,
        { unitIds, questionCount, structureReviewed: true },
      )
      .then((r) => r.data),
  publish: (id: number, artifactIds: number[]) =>
    api
      .post<{
        results: {
          artifactId: number;
          status: string;
          error?: string;
          assignmentId?: number;
        }[];
      }>(`/ai/curriculum/${id}/publish`, { artifactIds, reviewed: true })
      .then((r) => r.data),
};
