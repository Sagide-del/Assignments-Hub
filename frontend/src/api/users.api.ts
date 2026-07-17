import { api } from './axios';
import type { AuthenticatedUser, Role } from '../types';

export interface UserRecord {
  id: number;
  name: string;
  email: string | null;
  admissionNumber: string | null;
  role: Role;
  grade: string | null;
  isActive: boolean;
  schoolId: number;
}

export interface ImportSummary {
  createdTeachers: number;
  createdStudents: number;
  skipped: number;
  generatedPasswords: { email: string; password: string }[];
  errors: string[];
}

// Matches backend/src/users/users.controller.ts.
export const usersApi = {
  create: (dto: Partial<UserRecord> & { password?: string }) =>
    api.post<UserRecord>('/users', dto).then((r) => r.data),

  findAll: (schoolId?: number) =>
    api.get<UserRecord[]>('/users', { params: { schoolId } }).then((r) => r.data),

  findOne: (id: number) => api.get<UserRecord>(`/users/${id}`).then((r) => r.data),

  update: (id: number, dto: Partial<UserRecord>) => api.patch<UserRecord>(`/users/${id}`, dto).then((r) => r.data),

  // POST /users/import — multipart .xlsx, field name "file". Bulk-creates
  // teachers/students; teacher accounts without a password in the sheet get
  // one auto-generated (returned once, here, never stored in plaintext).
  importExcel: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post<ImportSummary>('/users/import', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  },

  // GET /users/import/template — returns an .xlsx blob to download.
  downloadTemplate: () =>
    api.get('/users/import/template', { responseType: 'blob' }).then((r) => r.data as Blob),
};

export type { AuthenticatedUser };
