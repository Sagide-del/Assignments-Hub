import { api } from './axios';
import type { Message, MessageContact, MessageConversationSummary } from '../types';

// Matches backend/src/messages/messages.controller.ts.
export const messagesApi = {
  findContacts: () => api.get<MessageContact[]>('/messages/contacts').then((r) => r.data),

  findThread: (userId: number) => api.get<Message[]>(`/messages/thread/${userId}`).then((r) => r.data),

  sendMessage: (dto: { recipientId: number; body: string }) => api.post<Message>('/messages', dto).then((r) => r.data),

  getUnreadCount: () => api.get<{ count: number }>('/messages/unread-count').then((r) => r.data),

  findAdminConversations: (schoolId?: number) =>
    api.get<MessageConversationSummary[]>('/messages/admin/conversations', { params: { schoolId } }).then((r) => r.data),

  findAdminThread: (studentId: number, teacherId: number, schoolId?: number) =>
    api.get<Message[]>('/messages/admin/thread', { params: { studentId, teacherId, schoolId } }).then((r) => r.data),
};
