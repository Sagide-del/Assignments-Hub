// Read-only production checks: no study plans or academic records are created.
const base = (process.env.RBAC_API_URL || 'https://assignments-hub-api.onrender.com/api/v1').replace(/\/$/, '');
if (!base.startsWith('https://')) throw Error('Production access checks require HTTPS.');
if (!process.env.DEMO_TEACHER_PASSWORD) throw Error('Configure the demo teacher password securely.');
const request = (path, options = {}) => fetch(base + path, { ...options, redirect: 'error', signal: AbortSignal.timeout(20000) });
const login = await request('/auth/staff/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schoolCode: 'DEMO-001', email: 'otieno@demo.co.ke', password: process.env.DEMO_TEACHER_PASSWORD }) });
if (!login.ok) throw Error(`Demo login failed (HTTP ${login.status}).`);
const auth = await login.json();
if (auth.user?.role !== 'TEACHER' || !auth.accessToken) throw Error('Expected a teacher session.');
const headers = { Authorization: `Bearer ${auth.accessToken}` };
for (const path of ['/study-hub/timetable', '/study-hub/timetable/ae420311-7266-4a1f-9091-000000000002/pdf']) {
  if ((await request(path, { headers })).status !== 403) throw Error('Teacher access to private student timetables was not denied.');
}
if ((await request('/study-hub/timetable')).status !== 401) throw Error('Anonymous access to private student timetables was not denied.');
console.log('Verified live timetable role restrictions and anonymous denial. No plans or marks changed.');
