// First-party journey counts only. Never include query strings, form values,
// identity, answers, scores, payment references or credentials.
const stages = new Set(['practice_start', 'practice_complete', 'registration_open', 'registration_complete', 'payment_attempt']);
const inFlight = new Set();
export async function trackStage(stage) {
  if (!stages.has(stage) || navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;
  try {
    const path = location.pathname;
    if (!/^\/(?:$|blog\/[a-z0-9/-]*$|revision\/[a-z0-9/-]*$|free-revision\/?$|register\/?$|student\/activate\/?$)/.test(path)) return;
    const key = 'ah-acquisition-v1';
    let session = sessionStorage.getItem(key);
    if (!session) { session = crypto.randomUUID(); sessionStorage.setItem(key, session); }
    const sentKey = `${key}:${stage}`;
    if (sessionStorage.getItem(sentKey) || inFlight.has(stage)) return;
    inFlight.add(stage);
    try {
      const config = await fetch('/revision/assets/acquisition-config.json', { credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!config.ok) return;
      const { endpoint } = await config.json();
      const response = await fetch(endpoint, { method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session, stage, path }) });
      if (response.ok) sessionStorage.setItem(sentKey, '1');
    } finally { inFlight.delete(stage); }
  } catch { /* Analytics failure must never interrupt learning or payment. */ }
}
if (typeof window !== 'undefined') {
  window.addEventListener('assignmenthub:learning', event => {
    const stage = { quiz_start: 'practice_start', quiz_complete: 'practice_complete' }[event.detail?.name];
    if (stage) void trackStage(stage);
  });
}
