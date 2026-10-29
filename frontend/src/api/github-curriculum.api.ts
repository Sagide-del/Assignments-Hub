import { api } from "./axios";
export interface RepositorySourceAudit {
  repository: string;
  commit: string;
  path: string;
  sha256: string;
  revision: string;
  sourceUrl: string;
  officialDirectory: string;
  coverage: {
    summarySubstrands: number;
    extractedSubstrands: number;
    missingIds: string[];
    truncatedRows: number;
    warnings: string[];
  };
  comparisons: { sourceId: number; matchedQuotes: number }[];
  limitationsReviewed: boolean;
}
export interface RepositoryDesignPreview {
  id: string;
  grade: string;
  subject: string;
  path: string;
  revision: string;
  sourceUrl: string;
  officialDirectory: string;
  extraction: {
    rows?: number;
    outcomes?: number;
    coverage?: RepositorySourceAudit["coverage"];
    error?: string;
  };
}
export const githubCurriculumApi = {
  catalogue: (grade: string) =>
    api
      .get<{
        repository: string;
        commit: string;
        files: RepositoryDesignPreview[];
      }>("/admin/content-ingestion/github", { params: { grade } })
      .then((r) => {
        if (!Array.isArray(r.data.files) || typeof r.data.commit !== "string")
          throw Error("Curriculum source list is unavailable.");
        return r.data;
      }),
  import: (grade: string, commit: string, fileIds: string[]) =>
    api
      .post<{ queued: number; skipped: number; collectionId: string | null }>(
        "/admin/content-ingestion/github/import",
        { grades: [grade], commit, fileIds, rightsConfirmed: true },
      )
      .then((r) => r.data),
};
