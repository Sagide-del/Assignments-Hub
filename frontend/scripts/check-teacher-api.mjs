const base = (process.env.VITE_API_URL || 'https://assignments-hub-api.onrender.com/api/v1').replace(/\/$/, '');
const response = await fetch(`${base}/teacher/capabilities`, { signal: AbortSignal.timeout(15000) });
if (!response.ok || (await response.json()).teacherScopeVersion !== 1) {
  throw new Error('Teacher scope API and migration must be deployed before publishing this frontend.');
}
console.log('Teacher scope API and schema are ready.');
