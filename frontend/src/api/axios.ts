import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth.store';
import type { TokenPair } from '../types';

// See .env.example — unset in local dev, the Vite proxy handles /api/v1/*.
const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Single-flight refresh: if several requests 401 at once, only one
// /auth/refresh call goes out and the rest wait on the same promise —
// matches the backend's refresh-token rotation (each refresh token is
// single-use; firing the endpoint twice concurrently would revoke sessions).
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setSession, clearSession } = useAuthStore.getState();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = axios
      .post<TokenPair>(`${baseURL}/auth/refresh`, { refreshToken })
      .then((res) => {
        setSession(res.data);
        return res.data.accessToken;
      })
      .catch(() => {
        clearSession();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;

    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      // Refresh itself failed — session is dead, send the user back to login.
      if (typeof window !== 'undefined') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);

/** Extracts a human-readable message from the backend's error shape. */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    if (Array.isArray(data?.message)) return data!.message.join(', ');
    if (typeof data?.message === 'string') return data.message;
  }
  return fallback;
}
