import { api } from "./axios";
export interface CslLog {
  id: string;
  activity_name: string;
  description: string;
  hours_logged: number;
  activity_date: string;
  photo_url: string | null;
  photo_unavailable?: boolean;
  competency_tags: string[];
  review_status: "PENDING" | "APPROVED" | "REJECTED";
  rejection_comment: string | null;
  ai_status: "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED";
  student?: {
    id: number;
    name: string;
    admissionNumber: string | null;
    grade: string;
    studentProfile?: { stream: string | null } | null;
  };
}
export interface CslHours {
  approved_hours: number;
  pending_hours: number;
  target_hours: number;
  complete: boolean;
  logs: CslLog[];
}
export const cslLogbookApi = {
  mine: () => api.get<CslHours>("/csl/my-hours").then((r) => r.data),
  log: (data: FormData) =>
    api.post<CslLog>("/csl/log", data, { timeout: 60000 }).then((r) => r.data),
  pending: () =>
    api
      .get<{ logs: CslLog[]; limit: number }>("/csl/pending")
      .then((r) => r.data),
  approve: (id: string) => api.patch(`/csl/${id}/approve`).then((r) => r.data),
  reject: (id: string, comment: string) =>
    api.patch(`/csl/${id}/reject`, { comment }).then((r) => r.data),
  pdf: (id: number) =>
    api
      .get(`/csl/${id}/logbook-pdf`, { responseType: "blob", timeout: 120000 })
      .then((r) => r.data as Blob),
};
export function saveCslPdf(blob: Blob) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "csl-logbook.pdf";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function cslToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const d = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${d.year}-${d.month}-${d.day}`;
}
