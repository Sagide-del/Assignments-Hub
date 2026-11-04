const base = (process.env.VITE_API_URL || 'https://assignments-hub-api.onrender.com/api/v1').replace(/\/$/, '');
const attempts = Math.min(40, Math.max(1, Number(process.env.TIMETABLE_API_ATTEMPTS) || 30));
let ready = false;
for (let n = 0; n < attempts; n++) {
  try {
    const response = await fetch(`${base}/study-hub/capabilities`, { signal: AbortSignal.timeout(10000) });
    if (response.ok && (await response.json()).timetableVersion === 1) { ready = true; break; }
  } catch { /* Backend rolling deployment; bounded retry without credentials. */ }
  if (n + 1 < attempts) await new Promise(resolve => setTimeout(resolve, 5000));
}
if (!ready) throw Error('Weekly study timetable API and both timetable tables must be ready before publishing.');
console.log('Weekly study timetable API and schema are ready.');
