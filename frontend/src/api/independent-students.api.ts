import { api } from './axios';
import type {
  IndependentPaymentClaim,
  IndependentStudent,
  IndependentStudentInvoice,
  IndependentStudentPaymentInfo,
  IndependentStudentSummary,
  IndependentWelcomeResult,
} from '../types';

// Matches backend/src/independent-students/independent-students.controller.ts.
export const independentStudentsApi = {
  getPaymentInfo: () => api.get<IndependentStudentPaymentInfo>('/independent-students/payment-info').then((r) => r.data),

  getPublicPaymentInfo: () =>
    api.get<IndependentStudentPaymentInfo>('/independent-students/public/payment-info').then((r) => r.data),

  submitPaymentClaim: (dto: {
    identifier: string;
    interval: 'MONTHLY' | 'ANNUAL';
    mpesaCode: string;
    payerPhone?: string;
  }) =>
    api.post<Pick<IndependentPaymentClaim, 'id' | 'status' | 'amountKES' | 'interval' | 'createdAt'>>(
      '/independent-students/public/payment-claims',
      dto,
    ).then((r) => r.data),

  findStudents: () => api.get<IndependentStudent[]>('/independent-students/students').then((r) => r.data),

  getSummary: () =>
    api.get<IndependentStudentSummary>('/independent-students/summary').then((r) => r.data),

  createStudent: (dto: { name: string; admissionNumber?: string; grade?: string; parentPhone?: string }) =>
    api.post<IndependentStudent>('/independent-students/students', dto).then((r) => r.data),

  sendWelcome: (id: number, dto: { phone?: string; message?: string }) =>
    api.post<IndependentWelcomeResult>(`/independent-students/students/${id}/welcome`, dto).then((r) => r.data),

  findInvoices: (studentId?: number) =>
    api.get<IndependentStudentInvoice[]>('/independent-students/invoices', { params: { studentId } }).then((r) => r.data),

  recordInvoice: (dto: {
    studentId: number;
    studentName?: string;
    amountKES: number;
    interval?: 'monthly' | 'annual';
    mpesaCode: string;
    payerPhone?: string;
  }) => api.post<IndependentStudentInvoice>('/independent-students/invoices', dto).then((r) => r.data),

  findPaymentClaims: () =>
    api.get<IndependentPaymentClaim[]>('/independent-students/payment-claims').then((r) => r.data),

  approvePaymentClaim: (id: number) =>
    api.patch(`/independent-students/payment-claims/${id}/approve`).then((r) => r.data),

  rejectPaymentClaim: (id: number, reason?: string) =>
    api.patch(`/independent-students/payment-claims/${id}/reject`, { reason }).then((r) => r.data),
};
