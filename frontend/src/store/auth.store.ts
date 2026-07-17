import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthenticatedUser, TokenPair } from '../types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthenticatedUser | null;
  // Wall-clock ms timestamp when the access token expires — set from the
  // login/refresh response's `expiresIn` (seconds), lets the axios
  // interceptor decide whether to proactively refresh before a 401.
  accessTokenExpiresAt: number | null;
  setSession: (pair: TokenPair) => void;
  clearSession: () => void;
  isAuthenticated: () => boolean;
}

// Persisted to localStorage so a refresh doesn't log the user out — this is
// real app storage (not a Claude "artifact" sandbox), so localStorage is the
// right call here. Only tokens + the user object are stored; no passwords,
// no school secrets.
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      accessTokenExpiresAt: null,

      setSession: (pair) =>
        set({
          accessToken: pair.accessToken,
          refreshToken: pair.refreshToken,
          user: pair.user,
          accessTokenExpiresAt: Date.now() + pair.expiresIn * 1000,
        }),

      clearSession: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          accessTokenExpiresAt: null,
        }),

      isAuthenticated: () => !!get().accessToken && !!get().user,
    }),
    { name: 'assignments-hub-auth' },
  ),
);
