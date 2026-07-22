import { api } from './axios';

export interface SmsSendSummary {
  totalRecipients: number;
  sent: number;
  failed: number;
  skippedNoPhone: number;
  gatewayConfigured: boolean;
}

export interface SmsLogRecord {
  id: number;
  type: 'ASSIGNMENT_COMPLETED' | 'NEW_ASSIGNMENT' | 'BROADCAST';
  toPhone: string;
  message: string;
  status: 'SENT' | 'FAILED';
  errorMessage: string | null;
  studentId: number | null;
  assignmentId: number | null;
  createdAt: string;
  student?: { id: number; name: string; grade: string | null } | null;
  sentBy?: { id: number; name: string } | null;
}

export const smsApi = {
  broadcast: (dto: { message: string; grade?: string }) =>
    api.post<SmsSendSummary>('/sms/broadcast', dto).then((response) => response.data),

  notifyAssignment: (assignmentId: number) =>
    api.post<SmsSendSummary>(`/sms/notify-assignment/${assignmentId}`, {}).then((response) => response.data),

  getLogs: () => api.get<SmsLogRecord[]>('/sms/logs').then((response) => response.data),
};
