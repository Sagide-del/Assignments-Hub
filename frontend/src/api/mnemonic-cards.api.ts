import { api } from './axios';
import type { MnemonicCard } from '../types';

export interface MnemonicCardInput {
  title: string;
  subject: string;
  topic: string;
  grade?: string | null;
  description?: string | null;
  pdfUrl: string;
  fileName: string;
  fileSize?: number;
  isPublished?: boolean;
  displayOrder?: number;
}

export interface MnemonicCardSummary {
  total: number;
  published: number;
  drafts: number;
  subjects: number;
}

export const mnemonicCardsApi = {
  findAll: (filters?: { subject?: string; topic?: string }) =>
    api
      .get<MnemonicCard[]>('/mnemonic-cards', { params: filters })
      .then((response) => response.data),

  getAdminSummary: () =>
    api
      .get<MnemonicCardSummary>('/mnemonic-cards/admin/summary')
      .then((response) => response.data),

  create: (dto: MnemonicCardInput) =>
    api.post<MnemonicCard>('/mnemonic-cards', dto).then((response) => response.data),

  update: (id: number, dto: Partial<MnemonicCardInput>) =>
    api.patch<MnemonicCard>(`/mnemonic-cards/${id}`, dto).then((response) => response.data),

  remove: (id: number) =>
    api.delete<{ id: number }>(`/mnemonic-cards/${id}`).then((response) => response.data),
};
