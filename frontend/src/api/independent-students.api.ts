import { api } from './axios';
import type { IndependentStudent, IndependentStudentInvoice, IndependentStudentPaymentInfo } from '../types';

// Matches backend/src/independent-students/independent-students.controller.ts.
export const independentStudentsApi = {
  getPaymentInfo: () => api.get<IndependentStudentPaymentInfo>('/independent-students/payment-info').then((r) => r.data),

  findStudents: () => api.get<IndependentStudent[]>('/independent-students/students').then((r) => r.data),

  createStudent: (dto: { name: string; admissionNumber?: string; grade?: string; parentPhone?: string }) =>
    api.post<IndependentStudent>('/independent-students/students', dto).then((r) => r.data),

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
};
