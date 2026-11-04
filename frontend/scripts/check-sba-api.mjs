const base = (process.env.VITE_API_URL || 'https://assignments-hub-api.onrender.com/api/v1').replace(/\/$/, '');
const attempts = Math.min(40, Math.max(1, Number(process.env.SBA_API_ATTEMPTS) || 30));
let ready = false;
for (let n = 0; n < attempts; n++) {
  try { const response = await fetch(`${base}/sba/capabilities`, { signal: AbortSignal.timeout(10000) }); if (response.ok) { const body = await response.json(); if (body.sbaVersion === 1 && body.questionBlueprintVersion === 1 && body.sbaImportVersion === 1) { ready = true; break; } } } catch { /* Rolling backend deploy; bounded retry, no credentials. */ }
  if (n + 1 < attempts) await new Promise(resolve => setTimeout(resolve, 5000));
}
if (!ready) throw Error('SBA import API, external mocks/projections tables and question blueprint column must be ready before publishing the frontend.');
console.log('SBA import, projection and question blueprint API/schema are ready.');
