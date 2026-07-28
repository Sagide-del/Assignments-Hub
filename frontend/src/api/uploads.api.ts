import { api } from './axios';

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
}

/**
 * Uploaded files are served at /uploads rather than below the API prefix.
 * Resolve that path against the configured API origin when the frontend and
 * backend are deployed separately. Same-origin development keeps the path
 * relative so Vite can proxy it.
 */
export function resolveUploadUrl(url: string): string {
  if (!url.startsWith('/uploads/')) return url;

  const configuredApiUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (!configuredApiUrl || configuredApiUrl.startsWith('/')) return url;

  try {
    return new URL(url, new URL(configuredApiUrl).origin).toString();
  } catch {
    return url;
  }
}

// Matches backend/src/uploads/uploads.controller.ts. Allowed types are
// enforced server-side (images, pdf, office docs, txt, mp4, mp3 — never
// html/svg/script-executable formats). Returns a same-origin URL to store
// wherever the caller needs it (assignment attachments, CSL evidence,
// FILE_UPLOAD answers, school logo).
export const uploadsApi = {
  uploadSingle: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post<UploadResult>('/uploads/single', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => ({ ...r.data, url: resolveUploadUrl(r.data.url) }));
  },
};
