import { api } from "./axios";
export interface MappingUnit {
  strand: string;
  subStrand: string;
  outcome: string;
  quote: string;
}
export interface Mapping {
  role: "CURRICULUM" | "TEACHING" | "FRAMEWORK";
  note: string;
  subjects: {
    grade: string;
    subject: string;
    pathway: string;
    evidence: string;
    units: MappingUnit[];
  }[];
}
export interface IngestionAsset {
  id: string;
  name: string;
  origin: string;
  role: string;
  status: string;
  mapping: Mapping | null;
  error: string | null;
  sourceIds: number[];
}
export interface SourceReference {
  id: number;
  title: string;
  grade: string;
  subject: string;
  role: string;
  reviewed: boolean;
  fileName: string | null;
}
export interface ScopeCoverage {
  id: number;
  grade: string;
  subject: string;
  pathway: string;
  authority: string;
  verified: boolean;
  outcomeCount: number;
  verifiedOutcomes: number;
  readyOutcomes: number;
  unitIds: number[];
  curriculumSources: number;
  teachingSources: number;
  draftQuestions: number;
  approvedQuestions: number;
  draftCards: number;
  publishedCards: number;
}
export interface Outcome extends MappingUnit {
  id: number;
  scopeId: number;
  sourceDocumentId: number;
  supportingSourceIds: number[];
  verified: boolean;
}
export const ingestionApi = {
  overview: () =>
    api
      .get<{
        version: number;
        collectionIndex?: {
          id: string;
          name: string;
          _count: { assets: number };
        }[];
        gradeReviews: { grade: string; verifiedAt: string | null }[];
        collections: {
          id: string;
          name: string;
          grades: string[];
          assets: IngestionAsset[];
        }[];
        sources: SourceReference[];
        scopes: ScopeCoverage[];
        limits: { collectionAssets: number };
      }>("/admin/content-ingestion")
      .then((r) => r.data),
  create: (input: {
    name: string;
    grades: string[];
    rightsConfirmed: true;
    urls?: string[];
  }) =>
    api
      .post<{ id: string }>("/admin/content-ingestion/collections", input)
      .then((r) => r.data),
  fromLibrary: async (sourceIds: number[]) => {
    let count = 0;
    for (let i = 0; i < sourceIds.length; i += 200) {
      const r = await api.post<{ count: number }>(
        "/admin/content-ingestion/from-library",
        { sourceIds: sourceIds.slice(i, i + 200) },
      );
      count += r.data.count;
    }
    return { count };
  },
  upload: (id: string, file: File) => {
    const data = new FormData();
    data.append("file", file, file.name);
    data.append("relativePath", file.webkitRelativePath || file.name);
    return api
      .post<{ results: { name: string; id?: string; error?: string }[] }>(
        `/admin/content-ingestion/collections/${id}/file`,
        data,
        { timeout: 180000 },
      )
      .then((r) => r.data);
  },
  documents: (id: string, page: number) =>
    api
      .get<{
        name: string;
        items: IngestionAsset[];
        total: number;
        page: number;
        take: number;
      }>(`/admin/content-ingestion/collections/${id}/documents`, {
        params: { page },
      })
      .then((r) => r.data),
  asset: (id: string) =>
    api
      .get<IngestionAsset & { extractedText: string }>(
        `/admin/content-ingestion/assets/${id}`,
      )
      .then((r) => r.data),
  mapping: (id: string, mapping: Mapping) =>
    api
      .patch(`/admin/content-ingestion/assets/${id}`, { mapping })
      .then((r) => r.data),
  retry: async (ids: string[]) => {
    let queued = 0,
      skipped = 0;
    for (let n = 0; n < ids.length; n += 100) {
      const r = await api.post<{ queued: number; skipped: number }>(
        "/admin/content-ingestion/assets/retry",
        { ids: ids.slice(n, n + 100) },
      );
      queued += r.data.queued;
      skipped += r.data.skipped;
    }
    return { queued, skipped };
  },
  approve: async (ids: string[]) => {
    let queued = 0;
    for (let n = 0; n < ids.length; n += 100) {
      const r = await api.post<{ queued: number }>(
        "/admin/content-ingestion/assets/review",
        { ids: ids.slice(n, n + 100) },
      );
      queued += r.data.queued;
    }
    return { queued };
  },
  catalogue: (rows: string, authority: string) =>
    api
      .post<{ count: number }>("/admin/content-ingestion/catalogue", {
        rows,
        authority,
      })
      .then((r) => r.data),
  verify: (grades: string[]) =>
    api
      .post("/admin/content-ingestion/catalogue/verify", {
        grades,
        reviewed: true,
      })
      .then((r) => r.data),
  removeScope: (id: number) =>
    api.delete(`/admin/content-ingestion/scopes/${id}`).then((r) => r.data),
  units: (id: number) =>
    api
      .get<Outcome[]>(`/admin/content-ingestion/scopes/${id}/units`)
      .then((r) => r.data),
  reviewUnit: (unit: Outcome) =>
    api
      .patch(`/admin/content-ingestion/units/${unit.id}`, {
        strand: unit.strand,
        subStrand: unit.subStrand,
        outcome: unit.outcome,
        quote: unit.quote,
        supportingSourceIds: unit.supportingSourceIds,
        verified: unit.verified,
      })
      .then((r) => r.data),
  generate: async (
    unitIds: number[],
    kind: "QUESTIONS" | "CARDS" | "BOTH",
    count: number,
    assessmentMode: "PRACTICE" | "WRITTEN" = "PRACTICE",
  ) => {
    let queued = 0;
    for (let n = 0; n < unitIds.length; n += 200) {
      const r = await api.post<unknown[]>("/admin/content-ingestion/generate", {
        unitIds: unitIds.slice(n, n + 200),
        kind,
        count,
        assessmentMode,
      });
      queued += r.data.length;
    }
    return { queued };
  },
};
