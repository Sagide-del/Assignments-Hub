// shared/config.js — single place to point the frontend at the right API.
//
// Load this script BEFORE shared/api.js (or any inline page script) on every
// page. It sets window.API_BASE_URL, which shared/api.js and each dashboard
// page read instead of hardcoding a URL.
//
// TO DEPLOY: set DEPLOYED_API_BASE_URL below to your live backend's URL
// and leave it as a non-empty string.

(function () {
  // ============================================================
  // 🔧 PRODUCTION BACKEND URL (Railway via api subdomain)
  // ============================================================
  const DEPLOYED_API_BASE_URL = 'https://api.assignmenthub.co.ke/api/v1';
  
  // For local development (keep as is)
  const LOCAL_API_BASE_URL = 'http://localhost:3000/api/v1';

  window.API_BASE_URL = DEPLOYED_API_BASE_URL || LOCAL_API_BASE_URL;

  // Pages use this to decide whether to pre-fill demo login credentials
  window.IS_LOCAL_ENV = !DEPLOYED_API_BASE_URL;

  // IntaSend Publishable Key
  window.INTASEND_PUBLISHABLE_KEY = 'ISPubKey_live_f3fc8520-a127-4ff0-9270-c1e8bb009b6b';

  console.log(`[Config] API_BASE_URL: ${window.API_BASE_URL}`);
  console.log(`[Config] Environment: ${window.IS_LOCAL_ENV ? 'Local' : 'Production'}`);
})();