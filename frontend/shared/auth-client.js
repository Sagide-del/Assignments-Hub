// shared/auth-client.js — session storage + silent JWT refresh.
//
// Load this AFTER shared/config.js (needs window.API_BASE_URL) and BEFORE
// any page script that calls fetch() against the API. It does two things:
//
//   1. Owns reading/writing the access token, refresh token, and logged-in
//      user out of localStorage, using the SAME localStorage keys every
//      page already uses ('token', 'user', 'userRole', ...) so existing
//      per-page getToken()/checkAuth() functions keep working untouched.
//
//   2. Patches window.fetch so that any call to the API that comes back
//      401 (access token expired — they now only last ~15 minutes) is
//      transparently retried once after exchanging the refresh token for a
//      new pair. Callers never see the 401; they just get the real
//      response, possibly a beat slower. A proactive timer also refreshes
//      shortly before the access token is due to expire, so most users
//      never hit the reactive 401 path at all.
//
// If the refresh token itself is invalid/expired/revoked, every page's
// session is torn down the same way: localStorage is cleared and the user
// is sent back to the Unified Login page.

(function () {
  const ACCESS_TOKEN_KEY = 'token';
  const REFRESH_TOKEN_KEY = 'refreshToken';
  const EXPIRES_AT_KEY = 'tokenExpiresAt';

  // Endpoints that must never be caught by the 401-retry-with-refresh
  // logic below — retrying these would either loop forever (refresh
  // itself) or doesn't make sense (login hasn't happened yet, so there's
  // nothing to refresh).
  const AUTH_ENDPOINT_SUFFIXES = ['/auth/staff/login', '/auth/student/login', '/auth/refresh', '/auth/logout'];

  function apiBase() {
    return window.API_BASE_URL || '';
  }

  function getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  function getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  // Persists a fresh {accessToken, refreshToken, expiresIn, user} pair
  // (the exact shape POST /auth/*/login and POST /auth/refresh return) and
  // (re)schedules the proactive refresh timer. Deliberately does NOT touch
  // 'userRole' / 'userName' / other page-specific keys — callers set those
  // themselves right after login, same as before.
  function storeSession(data) {
    if (!data || !data.accessToken) return;
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    if (data.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    const ttlSeconds = typeof data.expiresIn === 'number' ? data.expiresIn : 15 * 60;
    localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + ttlSeconds * 1000));
    if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
    scheduleProactiveRefresh();
  }

  function clearSession() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
    if (refreshTimer) clearTimeout(refreshTimer);
  }

  // Revokes the refresh token server-side, then clears everything
  // client-side regardless of whether the network call succeeds (a user
  // who clicks "Log out" should always end up logged out locally, even if
  // offline).
  async function logout() {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await fetch(`${apiBase()}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (err) {
        // Network failure on logout shouldn't block clearing local state.
        console.warn('Logout revocation call failed (clearing session locally anyway):', err);
      }
    }
    clearSession();
  }

  let refreshTimer = null;
  let refreshInFlight = null; // Promise, shared by every concurrent 401 so we only ever rotate the refresh token once at a time.

  async function performRefresh() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token available');

    // Use the native fetch reference (captured before patching below) so
    // this call itself is never re-intercepted.
    const res = await nativeFetch(`${apiBase()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      const err = new Error('Session expired');
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    storeSession(data);
    return data;
  }

  // De-duplicates concurrent refresh attempts (e.g. 4 dashboard widgets all
  // 401 at once) into a single in-flight request that everyone awaits.
  function refreshOnce() {
    if (!refreshInFlight) {
      refreshInFlight = performRefresh().finally(() => {
        refreshInFlight = null;
      });
    }
    return refreshInFlight;
  }

  function scheduleProactiveRefresh() {
    if (refreshTimer) clearTimeout(refreshTimer);
    const expiresAt = parseInt(localStorage.getItem(EXPIRES_AT_KEY) || '0', 10);
    if (!expiresAt || !getRefreshToken()) return;

    // Refresh 60s before expiry, but never schedule something in the past
    // (e.g. the tab was backgrounded past expiry) — in that case refresh
    // almost immediately instead.
    const msUntilRefresh = Math.max(expiresAt - Date.now() - 60000, 2000);
    refreshTimer = setTimeout(() => {
      refreshOnce().catch(() => {
        // Proactive refresh failing (revoked/expired) means the session is
        // dead; send the user back to login rather than waiting for their
        // next click to hit a reactive 401.
        clearSession();
        redirectToLogin();
      });
    }, msUntilRefresh);
  }

  function redirectToLogin() {
    const onLoginPage = /unified-dashboard\/?(index\.html)?$/.test(window.location.pathname) || window.location.pathname === '/' || window.location.pathname === '';
    if (!onLoginPage) {
      const depth = window.location.pathname.split('/').filter(Boolean).length;
      // Best-effort relative path back to unified-dashboard from any of the
      // sibling dashboard folders (frontend/<page>/index.html).
      window.location.href = '../unified-dashboard/index.html?expired=1';
    }
  }

  function isAuthEndpoint(url) {
    return AUTH_ENDPOINT_SUFFIXES.some((suffix) => url.includes(suffix));
  }

  function isApiCall(url) {
    const base = apiBase();
    return !!base && url.startsWith(base);
  }

  // ---- Patch window.fetch ----
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async function patchedFetch(input, init) {
    const url = typeof input === 'string' ? input : input && input.url ? input.url : '';
    const response = await nativeFetch(input, init);

    if (response.status !== 401 || !isApiCall(url) || isAuthEndpoint(url)) {
      return response;
    }

    // Only worth retrying if this request was actually authenticated —
    // an unauthenticated 401 (e.g. a public endpoint misbehaving) refreshing
    // wouldn't fix anything.
    const hadAuthHeader =
      init && init.headers && (init.headers['Authorization'] || init.headers['authorization'] ||
        (typeof init.headers.get === 'function' && init.headers.get('Authorization')));
    if (!hadAuthHeader || !getRefreshToken()) {
      return response;
    }

    try {
      await refreshOnce();
    } catch (err) {
      clearSession();
      redirectToLogin();
      return response; // Give the caller the original 401 — the redirect above is already in flight.
    }

    // Retry the original request once, with the new access token swapped
    // in. Requests built with a plain headers object (every dashboard page
    // uses `headers: { Authorization: \`Bearer ${token}\` }`) are the
    // common case; Headers instances are also supported.
    const retryInit = Object.assign({}, init);
    const newToken = getAccessToken();
    if (retryInit.headers && typeof retryInit.headers.set === 'function') {
      retryInit.headers.set('Authorization', `Bearer ${newToken}`);
    } else {
      retryInit.headers = Object.assign({}, retryInit.headers, { Authorization: `Bearer ${newToken}` });
    }
    return nativeFetch(input, retryInit);
  };

  // Kick off the proactive timer immediately if a session already exists
  // (e.g. the user refreshed the page rather than just logging in).
  scheduleProactiveRefresh();

  window.AuthClient = {
    getAccessToken,
    getRefreshToken,
    storeSession,
    clearSession,
    logout,
    scheduleProactiveRefresh,
  };
})();
