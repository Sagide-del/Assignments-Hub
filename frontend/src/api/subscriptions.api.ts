import { api } from './axios';
import type {
  BillingInvoice,
  BillingPaymentTransaction,
  BillingProviderConfig,
  BillingReconciliation,
  ComputedPricing,
  PlatformAiBillingVisibility,
  PlatformBillingDashboard,
  SchoolAiBillingVisibility,
  SchoolBillingSnapshot,
  SubscriptionPlanTier,
} from '../types';

export interface Subscription {
  id: number;
  schoolId: number;
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  expiresAt: string | null;
}

export const subscriptionsApi = {
  findAll: (schoolId?: number) =>
    api.get<Subscription[]>('/subscriptions', { params: { schoolId } }).then((r) => r.data),

  findOne: (id: number) => api.get<Subscription>(`/subscriptions/${id}`).then((r) => r.data),

  create: (dto: { schoolId: number; plan: string; status: string }) =>
    api.post<Subscription>('/subscriptions', dto).then((r) => r.data),

  update: (id: number, dto: Partial<Subscription>) =>
    api.patch<Subscription>(`/subscriptions/${id}`, dto).then((r) => r.data),
};

export const paymentApi = {
  getTiers: () => api.get<{ tiers: SubscriptionPlanTier[] }>('/payment/tiers').then((r) => r.data.tiers),

  getPricing: (schoolId?: number) =>
    api.get<ComputedPricing>('/payment/pricing', { params: { schoolId } }).then((r) => r.data),

  getProviders: () => api.get<BillingProviderConfig[]>('/payment/providers').then((r) => r.data),

  getCurrentSubscription: (schoolId?: number) =>
    api.get<SchoolBillingSnapshot>('/payment/subscription/current', { params: { schoolId } }).then((r) => r.data),

  getInvoices: (schoolId?: number) =>
    api.get<BillingInvoice[]>('/payment/invoices', { params: { schoolId } }).then((r) => r.data),

  getTransactions: (params?: { schoolId?: number; status?: string; method?: string }) =>
    api.get<BillingPaymentTransaction[]>('/payment/transactions', { params }).then((r) => r.data),

  createPayment: (email: string, schoolId: number) =>
    api.post('/payment/create', { email, schoolId }).then((r) => r.data),

  createSubscriptionCheckout: (email: string, schoolId: number, interval: 'monthly' | 'annual' = 'monthly') =>
    api.post('/payment/subscription', { email, schoolId, interval }).then((r) => r.data),

  createEquityPaybillPayment: (dto: {
    schoolId?: number;
    paymentReference: string;
    payerName: string;
    payerPhone: string;
    interval?: 'monthly' | 'annual';
  }) => api.post('/payment/equity-paybill', dto).then((r) => r.data),

  createMpesaPayment: (dto: {
    schoolId?: number;
    payerName: string;
    payerPhone: string;
    interval?: 'monthly' | 'annual';
  }) => api.post('/payment/mpesa', dto).then((r) => r.data),

  approveTransaction: (id: number) => api.patch(`/payment/transactions/${id}/approve`, {}).then((r) => r.data),

  rejectTransaction: (id: number, reason?: string) =>
    api.patch(`/payment/transactions/${id}/reject`, { reason }).then((r) => r.data),

  getDashboard: () => api.get<PlatformBillingDashboard>('/payment/dashboard').then((r) => r.data),

  getReconciliation: () => api.get<BillingReconciliation>('/payment/reconciliation').then((r) => r.data),

  getAiUsageVisibility: (schoolId?: number) =>
    api
      .get<SchoolAiBillingVisibility | PlatformAiBillingVisibility>('/payment/ai-usage', { params: { schoolId } })
      .then((r) => r.data),

  downloadInvoice: (id: number) =>
    api
      .get<Blob>(`/payment/invoices/${id}/download`, { responseType: 'blob' as const })
      .then((r) => r.data),

  verify: (invoiceId: string) => api.get('/payment/verify', { params: { invoiceId } }).then((r) => r.data),
};
