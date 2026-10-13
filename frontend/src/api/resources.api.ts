import { api } from './axios';

export type ResourceListingType = 'NOTES' | 'ESSAY' | 'REVISION_GUIDE' | 'STUDY_GUIDE' | 'TOOLKIT';
export type ResourceFulfillment = 'DIGITAL_DOWNLOAD' | 'PHYSICAL_DELIVERY';
export type ResourceListingStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type ResourcePurchaseStatus = 'PENDING_PAYMENT' | 'AWAITING_VERIFICATION' | 'PAID' | 'REJECTED' | 'CANCELLED' | 'FULFILLED';
export type MarketplacePaymentMethod = 'MPESA' | 'EQUITY_PAYBILL';

export interface ResourceListing {
  id: number;
  title: string;
  description: string | null;
  type: ResourceListingType;
  fulfillment: ResourceFulfillment;
  status: ResourceListingStatus;
  subject: string | null;
  grade: string | null;
  priceKES: number;
  fileName: string | null;
  fileSize: number | null;
  coverImageUrl: string | null;
  stockQuantity: number | null;
  publishedAt: string | null;
  createdAt: string;
  seller: { id: number; name: string; school: { name: string } };
  purchaseStatus: ResourcePurchaseStatus | null;
  downloadAvailable: boolean;
  _count?: { purchases: number };
}

export interface ResourcePurchase {
  id: number;
  status: ResourcePurchaseStatus;
  paymentMethod: MarketplacePaymentMethod | null;
  paymentReference: string | null;
  amountKES: number;
  sellerShareKES: number;
  platformFeeKES: number;
  createdAt: string;
  resource: ResourceListing & { seller: { id?: number; name: string } };
  student?: { id: number; name: string; school: { name: string } };
}

export interface MarketplacePaymentOption {
  method: MarketplacePaymentMethod;
  displayName: string;
  logoUrl: string | null;
  instructions: string | null;
  isActive: boolean;
  paymentDetails: Record<string, unknown> | null;
}

export interface CreateResourceInput {
  title: string;
  description?: string;
  type: ResourceListingType;
  fulfillment: ResourceFulfillment;
  subject?: string;
  grade?: string;
  priceKES: number;
  assetKey?: string;
  fileName?: string;
  fileSize?: number;
  coverImageUrl?: string;
  stockQuantity?: number;
}

export interface SellerSummary {
  confirmedSales: number;
  grossKES: number;
  sellerShareKES: number;
  platformFeeKES: number;
  awaitingVerification: number;
  recentSales: ResourcePurchase[];
}

export const resourcesApi = {
  findAll: (params?: { type?: string; subject?: string; search?: string }) =>
    api.get<ResourceListing[]>('/resources', { params }).then((response) => response.data),

  paymentOptions: () =>
    api.get<MarketplacePaymentOption[]>('/resources/payment-options').then((response) => response.data),

  myPurchases: () =>
    api.get<ResourcePurchase[]>('/resources/my-purchases').then((response) => response.data),

  purchase: (id: number, input: {
    paymentMethod?: MarketplacePaymentMethod;
    paymentReference?: string;
    payerPhone?: string;
    deliveryName?: string;
    deliveryPhone?: string;
    deliveryAddress?: string;
  }) => api.post<ResourcePurchase>(`/resources/${id}/purchase`, input).then((response) => response.data),

  download: (id: number) =>
    api.get<{ url: string; expiresInSeconds: number }>(`/resources/${id}/download`).then((response) => response.data),

  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ assetKey: string; filename: string; size: number }>('/resources/upload', form)
      .then((response) => response.data);
  },

  create: (input: CreateResourceInput) =>
    api.post<ResourceListing>('/resources', input).then((response) => response.data),

  myListings: () =>
    api.get<ResourceListing[]>('/resources/my-listings').then((response) => response.data),

  sellerSummary: () =>
    api.get<SellerSummary>('/resources/seller/summary').then((response) => response.data),

  publish: (id: number) =>
    api.post<ResourceListing>(`/resources/${id}/publish`).then((response) => response.data),

  archive: (id: number) =>
    api.delete<ResourceListing>(`/resources/${id}`).then((response) => response.data),

  adminPurchases: () =>
    api.get<ResourcePurchase[]>('/resources/admin/purchases').then((response) => response.data),

  reviewPurchase: (id: number, approved: boolean, reason?: string) =>
    api.post<ResourcePurchase>(`/resources/purchases/${id}/review`, { approved, reason }).then((response) => response.data),
};
