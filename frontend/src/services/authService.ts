// The integration seam between login UI and the real backend. Nothing here
// is invented: loginStudent/loginStaff call the exact same
// src/api/auth.api.ts functions (POST /auth/student/login,
// POST /auth/staff/login) that the rest of the app uses, and session storage
// goes through the existing Zustand auth store (src/store/auth.store.ts) —
// no parallel auth state, no second source of truth.
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import type { AuthenticatedUser, Role } from '../types';

export async function loginStudent(schoolCode: string, admissionNumber: string): Promise<AuthenticatedUser> {
  const pair = await authApi.loginStudent(schoolCode.trim().toUpperCase(), admissionNumber.trim());
  useAuthStore.getState().setSession(pair);
  return pair.user;
}

export async function loginStaff(schoolCode: string, email: string, password: string): Promise<AuthenticatedUser> {
  const pair = await authApi.loginStaff(schoolCode.trim().toUpperCase(), email.trim(), password);
  useAuthStore.getState().setSession(pair);
  return pair.user;
}

// Matches the route table in src/app/router/index.tsx exactly. Covers all
// four roles (including PLATFORM_ADMIN) even though this page never shows a
// Platform Admin login option — if a platform admin's credentials happen to
// come back from the staff endpoint, they still land somewhere valid rather
// than being misrouted to a dashboard their role can't access.
export function dashboardPathForRole(role: Role): string {
  switch (role) {
    case 'STUDENT':
      return '/student';
    case 'TEACHER':
      return '/teacher';
    case 'SCHOOL_ADMIN':
      return '/school-admin';
    case 'PLATFORM_ADMIN':
      return '/platform';
    default:
      return '/login';
  }
}
