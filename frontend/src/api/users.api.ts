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
  studentProfile: StudentProfileRecord | null;
}

export interface StudentProfileRecord {
  id: number;
  userId: number;
  admissionNumber: string | null;
  grade: string | null;
  className: string | null;
  stream: string | null;
  pathway: string | null;
  parentName: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
}

export interface ImportSummary {
  createdTeachers: number;
  createdStudents: number;
  skipped: number;
  generatedPasswords: { email: string; password: string }[];
  errors: string[];
}

export interface ImportErrorDetail {
  row: number;
  name?: string;
  field?: string;
  message: string;
}

export interface StudentImportPreviewResponse {
  success: boolean;
  preview: {
    detected: number;
    valid: number;
    duplicates: number;
    missingRequiredFields: number;
  };
  errors: ImportErrorDetail[];
}

export interface TeacherImportPreviewResponse {
  success: boolean;
  preview: {
    detected: number;
    valid: number;
    duplicates: number;
    missingRequiredFields: number;
  };
  errors: ImportErrorDetail[];
}

export interface StudentImportResponse {
  success: boolean;
  summary: {
    created: number;
    failed: number;
    duplicates: number;
  };
  errors: ImportErrorDetail[];
}

export interface TeacherImportResponse {
  success: boolean;
  summary: {
    created: number;
    failed: number;
  };
  generatedPasswords: {
    row: number;
    name?: string;
    email: string;
    password: string;
  }[];
  errors: ImportErrorDetail[];
}

export const usersApi = {
  create: (dto: Partial<UserRecord> & { password?: string }) =>
    api.post<UserRecord>('/users', dto).then((r) => r.data),

  findAll: (schoolId?: number) =>
    api.get<UserRecord[]>('/users', { params: { schoolId } }).then((r) => r.data),

  findOne: (id: number) => api.get<UserRecord>(`/users/${id}`).then((r) => r.data),

  update: (id: number, dto: Partial<UserRecord>) => api.patch<UserRecord>(`/users/${id}`, dto).then((r) => r.data),

  importExcel: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post<ImportSummary>('/users/import', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  },

  previewStudentsExcel: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post<StudentImportPreviewResponse>('/users/import/students/preview', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  importStudentsExcel: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post<StudentImportResponse>('/users/import/students', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  previewTeachersExcel: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post<TeacherImportPreviewResponse>('/users/import/teachers/preview', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  importTeachersExcel: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post<TeacherImportResponse>('/users/import/teachers', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  downloadTemplate: () =>
    api.get('/users/import/template', { responseType: 'blob' }).then((r) => r.data as Blob),

  downloadStudentTemplate: () =>
    api.get('/users/import/template/students', { responseType: 'blob' }).then((r) => r.data as Blob),

  downloadTeacherTemplate: () =>
    api.get('/users/import/template/teachers', { responseType: 'blob' }).then((r) => r.data as Blob),
};

export type { AuthenticatedUser };
