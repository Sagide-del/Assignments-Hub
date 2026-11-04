import { api } from "../api/axios";

export type CmsStatus =
  "DRAFT" | "APPROVED" | "PUBLISHED_STORE" | "PUBLISHED_SCHOOL" | "ARCHIVED";
export interface MasterModule {
  id: string;
  level: string;
  grade: number;
  pathway?: string | null;
  track?: string | null;
  subject: string;
  topic: string;
  content_json?: unknown;
  status: CmsStatus;
  created_at: string;
  updated_at: string;
  tenant_id?: string | null;
  generation_cost_tokens?: number;
  assignments?: {
    id: string;
    module_id: string;
    stream_id: string;
    published_at: string;
    due_date?: string | null;
  }[];
}
export interface CurriculumTaxonomy {
  id: string;
  level: string;
  grade: number;
  pathway: string | null;
  track: string | null;
  subject: string;
  topics: string[];
  source: string;
  verified: boolean;
}
export interface CreateCmsDraft {
  level?: string;
  grade: number;
  pathway?: string;
  track?: string;
  subject: string;
  topic: string;
}
export interface PublishCmsModule {
  module_id: string;
  target_type: "STORE" | "SCHOOL";
  target_id?: string;
  stream_ids?: string[];
}
const list = (value: unknown): MasterModule[] => {
  if (!Array.isArray(value))
    throw new Error("The content library returned an invalid response.");
  return value as MasterModule[];
};

// Reuse the app's token attachment, single-flight refresh and API base URL.
// CMS administration routes are protected by the backend role guard.
export const cmsApi = {
  getTaxonomy: (grade: number) =>
    api
      .get<CurriculumTaxonomy[]>("/cms/taxonomy", { params: { grade } })
      .then((response) => response.data),
  getModule: (id: string) =>
    api
      .get<MasterModule>(`/cms/modules/${encodeURIComponent(id)}`)
      .then((response) => response.data),
  getSchoolPublications: () =>
    api
      .get<MasterModule[]>("/cms/publications/schools")
      .then((response) => list(response.data)),
  getDrafts: () =>
    api
      .get<MasterModule[]>("/cms/drafts")
      .then((response) => list(response.data)),
  createDraft: (draft: CreateCmsDraft) =>
    api
      .post<MasterModule>("/cms/drafts", draft)
      .then((response) => response.data),
  enrichModule: (id: string) =>
    api
      .post<MasterModule>(`/cms/drafts/${encodeURIComponent(id)}/enrich`)
      .then((response) => response.data),
  approveModule: (id: string) =>
    api
      .patch<MasterModule>(`/cms/drafts/${encodeURIComponent(id)}/approve`)
      .then((response) => response.data),
  publishModule: (target: PublishCmsModule) =>
    api
      .post<MasterModule>("/cms/publish", target)
      .then((response) => response.data),
  getPublicStore: () =>
    api
      .get<MasterModule[]>("/cms/store")
      .then((response) => list(response.data)),
};
