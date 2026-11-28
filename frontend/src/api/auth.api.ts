import { api } from './axios';
import type { TokenPair, AuthenticatedUser, IndependentRegistrationResult } from '../types';

// Matches backend/src/auth/auth.controller.ts exactly.
export const authApi = {
  login: (identifier: string, password: string, schoolCode?: string) =>
    api.post<TokenPair>('/auth/login', { identifier, password, ...(schoolCode ? { schoolCode } : {}) }).then(r => r.data),

  loginStaff: (schoolCode: string, email: string, password: string) =>
    api.post<TokenPair>('/auth/staff/login', { schoolCode, email, password }).then((r) => r.data),

  loginStudent: (schoolCode: string, admissionNumber: string, pin?: string) =>
    api
      .post<TokenPair>('/auth/student/login', {
        schoolCode,
        admissionNumber,
        ...(pin ? { pin } : {}),
      })
      .then((r) => r.data),

  loginIndependent: (identifier: string, password: string) =>
    api.post<TokenPair>('/auth/independent/login', { identifier, password }).then((r) => r.data),

  registerIndependent: (dto: {
    name: string;
    username: string;
    email?: string;
    password: string;
    grade: string;
    pathway?: string;
    parentPhone?: string;
    landing_source?: string;
  }) =>
    api.post<IndependentRegistrationResult>('/auth/independent/register', dto).then((r) => r.data),

  requestIndependentRecovery: (identifier: string) =>
    api.post('/auth/independent/recovery/request', { identifier }).then((r) => r.data),

  resetIndependentPassword: (dto: { identifier: string; code: string; password: string }) =>
    api.post('/auth/independent/recovery/confirm', dto).then((r) => r.data),

  refresh: (refreshToken: string) =>
    api.post<TokenPair>('/auth/refresh', { refreshToken }).then((r) => r.data),

  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),

  me: () => api.get<AuthenticatedUser>('/auth/me').then((r) => r.data),
};
