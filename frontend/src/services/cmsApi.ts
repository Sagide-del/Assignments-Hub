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
}
export interface CreateCmsDraft {
  level: string;
  grade: number;
  pathway?: string;
  track?: string;
  subject: string;
  topic: string;
  content_json: Record<string, unknown>;
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
// No invented detail, school-list or AI-generation endpoints.
export const cmsApi = {
  getDrafts: () =>
    api
      .get<MasterModule[]>("/cms/drafts")
      .then((response) => list(response.data)),
  createDraft: (draft: CreateCmsDraft) =>
    api
      .post<MasterModule>("/cms/drafts", draft)
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
