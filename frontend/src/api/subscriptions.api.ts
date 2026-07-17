import { api } from './axios';
import type { ComputedPricing, SubscriptionPlanTier } from '../types';

export interface Subscription {
  id: number;
  schoolId: number;
  planName: string;
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | string;
  currentPeriodEnd: string | null;
}

// Matches backend/src/subscriptions/subscriptions.controller.ts.
export const subscriptionsApi = {
  findAll: (schoolId?: number) =>
    api.get<Subscription[]>('/subscriptions', { params: { schoolId } }).then((r) => r.data),

  findOne: (id: number) => api.get<Subscription>(`/subscriptions/${id}`).then((r) => r.data),

  create: (dto: { schoolId: number; planName: string; status: string }) =>
    api.post<Subscription>('/subscriptions', dto).then((r) => r.data),

  update: (id: number, dto: Partial<Subscription>) =>
    api.patch<Subscription>(`/subscriptions/${id}`, dto).then((r) => r.data),
};

// Matches backend/src/payment/payment.controller.ts. Pricing is ALWAYS
// server-computed from a school's live student count — the frontend never
// sends an amount, only ever displays what /payment/pricing returns.
export const paymentApi = {
  getTiers: () => api.get<{ tiers: SubscriptionPlanTier[] }>('/payment/tiers').then((r) => r.data.tiers),

  getPricing: (schoolId?: number) =>
    api.get<ComputedPricing>('/payment/pricing', { params: { schoolId } }).then((r) => r.data),

  createPayment: (email: string, schoolId: number) =>
    api.post('/payment/create', { email, schoolId }).then((r) => r.data),

  createSubscriptionCheckout: (email: string, schoolId: number, interval: 'monthly' | 'annual' = 'monthly') =>
    api.post('/payment/subscription', { email, schoolId, interval }).then((r) => r.data),

  verify: (invoiceId: string) => api.get('/payment/verify', { params: { invoiceId } }).then((r) => r.data),
};
