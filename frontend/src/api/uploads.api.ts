import { api } from './axios';

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
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
      .then((r) => r.data);
  },
};
