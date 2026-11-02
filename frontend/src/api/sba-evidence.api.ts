import { api } from './axios';

export interface SbaEvidence {
  id: number;
  subject: string;
  title: string;
  description: string | null;
  fileName: string | null;
  status: 'SUBMITTED' | 'VERIFIED' | 'NEEDS_REVISION';
  feedback: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export const sbaEvidenceApi = {
  list: () => api.get<SbaEvidence[]>('/sba-evidence').then((response) => response.data),
  create: (input: { subject: string; title: string; description?: string; file?: File }) => {
    const form = new FormData();
    form.append('subject', input.subject);
    form.append('title', input.title);
    if (input.description) form.append('description', input.description);
    if (input.file) form.append('file', input.file);
    return api.post<SbaEvidence>('/sba-evidence', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((response) => response.data);
  },
};
