import { api } from './axios';

export type EarlyYearsActivity = { id: string; grade: string; area: string; language: 'EN' | 'SW'; title: string; prompt: string; content: { choices: { emoji: string; label: string; correct: boolean }[]; celebration?: string; grownUpTip?: string }; status: 'DRAFT' | 'PUBLISHED'; audience: 'INDEPENDENT' | 'SCHOOLS' | 'BOTH'; schoolIds: number[]; createdAt: string };
export type GenerateEarlyYearsInput = { grade: string; area: string; language: 'EN' | 'SW'; count: number; audience: 'INDEPENDENT' | 'SCHOOLS' | 'BOTH'; schoolScope?: 'ALL' | 'SELECTED'; schoolIds?: number[] };

export const earlyYearsApi = {
  next: () => api.get<EarlyYearsActivity | null>('/early-years/next').then((r) => r.data),
  complete: (activityId: string) => api.post<EarlyYearsActivity | null>('/early-years/complete', { activityId }).then((r) => r.data),
  list: () => api.get<EarlyYearsActivity[]>('/early-years/admin').then((r) => r.data),
  generate: (input: GenerateEarlyYearsInput) => api.post<EarlyYearsActivity[]>('/early-years/admin/generate', input).then((r) => r.data),
  publish: (id: string, status: 'DRAFT' | 'PUBLISHED') => api.patch<EarlyYearsActivity>(`/early-years/admin/${id}`, { status }).then((r) => r.data),
};
