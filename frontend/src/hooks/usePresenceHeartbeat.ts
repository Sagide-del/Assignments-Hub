import { useEffect } from 'react';

import { presenceApi, type PresenceDeviceType } from '../api/presence.api';
import { useAuthStore } from '../store/auth.store';

const SESSION_KEY = 'assignment-hub-presence-session';
const HEARTBEAT_INTERVAL_MS = 60_000;

function createSessionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function sessionId() {
  const current = window.sessionStorage.getItem(SESSION_KEY);
  if (current) return current;
  const created = createSessionId();
  window.sessionStorage.setItem(SESSION_KEY, created);
  return created;
}

function deviceType(): PresenceDeviceType {
  const width = window.innerWidth;
  if (width <= 767) return 'MOBILE';
  if (width <= 1024) return 'TABLET';
  return 'DESKTOP';
}

function sendHeartbeat(pathname: string) {
  if (document.visibilityState !== 'visible') return;
  void presenceApi
    .heartbeat({ sessionId: sessionId(), currentPath: pathname, deviceType: deviceType() })
    .catch(() => undefined);
}

export async function endCurrentPresenceSession() {
  const current = window.sessionStorage.getItem(SESSION_KEY);
  if (!current) return;
  try {
    await presenceApi.end(current);
  } catch {
    // The inactivity window closes the session if the network is unavailable.
  } finally {
    window.sessionStorage.removeItem(SESSION_KEY);
  }
}

export function usePresenceHeartbeat(pathname: string) {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const canReportPresence = Boolean(userId && !user?.isIndependentTrial);

  useEffect(() => {
    if (!canReportPresence) return;
    sendHeartbeat(pathname);
  }, [canReportPresence, pathname]);

  useEffect(() => {
    if (!canReportPresence) return;

    const heartbeat = () => sendHeartbeat(window.location.pathname);
    const interval = window.setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') heartbeat();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [canReportPresence]);
}
