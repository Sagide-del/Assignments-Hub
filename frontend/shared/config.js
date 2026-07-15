// shared/config.js — single place to point the frontend at the right API.
//
// Load this script BEFORE shared/api.js (or any inline page script) on every
// page. It sets window.API_BASE_URL, which shared/api.js and each dashboard
// page read instead of hardcoding a URL.
//
// TO DEPLOY: set DEPLOYED_API_BASE_URL below to your live backend's URL
// (e.g. "https://api.yourdomain.com/api/v1") and leave it as a non-empty
// string. Until you do that, every environment — local dev, a LAN preview,
// this desktop app's preview, anywhere — falls back to the local backend at
// http://localhost:3000/api/v1 so "Failed to fetch" can't be caused by this
// file guessing a domain that doesn't exist yet.

(function () {
  const DEPLOYED_API_BASE_URL = ''; // e.g. 'https://api.yourdomain.com/api/v1'
  const LOCAL_API_BASE_URL = 'http://localhost:3000/api/v1';

  window.API_BASE_URL = DEPLOYED_API_BASE_URL || LOCAL_API_BASE_URL;

  // Pages use this to decide whether to pre-fill demo login credentials and
  // show the "Demo Credentials" hint box. On by default (safe for local dev
  // and staging); turns off automatically once DEPLOYED_API_BASE_URL above
  // is set, since that means this is pointed at a real deployment.
  window.IS_LOCAL_ENV = !DEPLOYED_API_BASE_URL;

  // Publishable (public) payment key used by the School Admin dashboard's
  // subscription checkout. Safe to expose client-side — it identifies the
  // merchant account, it does not authorize charges on its own. Falls back
  // to the backend's /payment/publishable-key endpoint if unset here, so it
  // always matches whatever IntaSend account the backend is configured for.
  window.INTASEND_PUBLISHABLE_KEY = '';
})();
