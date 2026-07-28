import { api } from './axios';
import type { TokenPair, AuthenticatedUser, IndependentRegistrationResult } from '../types';

// Matches backend/src/auth/auth.controller.ts exactly.
export const authApi = {
  loginStaff: (schoolCode: string, email: string, password: string) =>
    api.post<TokenPair>('/auth/staff/login', { schoolCode, email, password }).then((r) => r.data),

  loginStudent: (schoolCode: string, admissionNumber: string) =>
    api.post<TokenPair>('/auth/student/login', { schoolCode, admissionNumber }).then((r) => r.data),

  loginIndependent: (identifier: string, password: string) =>
    api.post<TokenPair>('/auth/independent/login', { identifier, password }).then((r) => r.data),

  registerIndependent: (dto: {
    name: string;
    email?: string;
    password: string;
    grade: string;
    parentPhone?: string;
  }) =>
    api.post<IndependentRegistrationResult>('/auth/independent/register', dto).then((r) => r.data),

  refresh: (refreshToken: string) =>
    api.post<TokenPair>('/auth/refresh', { refreshToken }).then((r) => r.data),

  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),

  me: () => api.get<AuthenticatedUser>('/auth/me').then((r) => r.data),
};
