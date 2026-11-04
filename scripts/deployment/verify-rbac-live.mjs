// Read-only application verification. Never logs a password or bearer token.
import { writeFileSync } from 'node:fs';
const base = (process.env.RBAC_API_URL || 'https://assignments-hub-api.onrender.com/api/v1').replace(/\/$/, '');
const password = process.env.DEMO_TEACHER_PASSWORD;
if (!password) throw Error('Configure DEMO_TEACHER_PASSWORD securely.');
if (!base.startsWith('https://') && !(process.env.RBAC_LOCAL_TEST === 'true' && /^http:\/\/127\.0\.0\.1:\d+\/api\/v1$/.test(base))) throw Error('Use HTTPS for production verification.');
const checks = [];
async function request(path, options = {}) {
  return fetch(base + path, { ...options, redirect: 'error', signal: AbortSignal.timeout(20000) });
}
try {
  const capabilities = await request('/teacher/capabilities');
  if (!capabilities.ok || (await capabilities.json()).teacherScopeVersion !== 1) throw Error('Teacher scope capability or schema is not ready.');
  checks.push('schema-backed teacher scope capability');
  const login = await request('/auth/staff/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schoolCode: 'DEMO-001', email: 'otieno@demo.co.ke', password }) });
  if (!login.ok) throw Error(`Demo teacher login failed (HTTP ${login.status}).`);
  const auth = await login.json();
  if (!auth.accessToken || auth.user?.role !== 'TEACHER') throw Error('Expected a teacher session.');
  const headers = { Authorization: `Bearer ${auth.accessToken}` };
  checks.push('production-only teacher credentials');
  const classesResponse = await request('/teacher/classes', { headers });
  if (!classesResponse.ok) throw Error('Assigned classes request failed.');
  const classes = await classesResponse.json();
  if (classes.length !== 1 || classes[0].subject !== 'Aviation Technology' || classes[0].stream?.name !== '1B' || classes[0].stream?.grade !== 'Grade 11') throw Error('Teacher classes include missing or unexpected scope.');
  checks.push('only Aviation Technology / Grade 11 / 1B assigned');
  const studentsResponse = await request('/teacher/students', { headers });
  if (!studentsResponse.ok) throw Error('Scoped student roster failed.');
  const students = await studentsResponse.json();
  if (students.length !== 1 || students[0].name !== 'Victor Halisi' || students[0].admissionNumber !== 'VH001') throw Error('Roster is not Victor Halisi only.');
  checks.push('Victor visible; Alice absent from roster');
  const aliceId = Number(process.env.RBAC_ALICE_ID);
  if (!Number.isSafeInteger(aliceId) || aliceId <= 0) throw Error('Set RBAC_ALICE_ID from the provisioning report to verify direct-object access.');
  if ((await request(`/users/${aliceId}`, { headers })).status !== 403) throw Error('Direct Alice profile access did not return 403.');
  checks.push('Alice direct profile access: HTTP 403');
  if ((await request('/teacher/students?stream=1A', { headers })).status !== 403) throw Error('Forged stream query did not return 403.');
  checks.push('forged stream query: HTTP 403');
  const report = { verifiedAt: new Date().toISOString(), api: base, passed: true, checks };
  if (process.env.RBAC_REPORT_FILE) writeFileSync(process.env.RBAC_REPORT_FILE, JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  const report = { verifiedAt: new Date().toISOString(), api: base, passed: false, checks, error: error.message };
  if (process.env.RBAC_REPORT_FILE) writeFileSync(process.env.RBAC_REPORT_FILE, JSON.stringify(report, null, 2), { mode: 0o600 });
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
}
