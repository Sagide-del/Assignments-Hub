// Read-only production checks; no enrolments, content or payments are changed.
const base=(process.env.RBAC_API_URL||'https://assignments-hub-api.onrender.com/api/v1').replace(/\/$/,'');
if(!base.startsWith('https://')||!process.env.DEMO_TEACHER_PASSWORD)throw Error('Configure HTTPS and secure demo credentials.');
const request=(path,options={})=>fetch(base+path,{...options,redirect:'error',signal:AbortSignal.timeout(20000)});
const login=await request('/auth/staff/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({schoolCode:'DEMO-001',email:'otieno@demo.co.ke',password:process.env.DEMO_TEACHER_PASSWORD})});
if(!login.ok)throw Error(`Demo login failed (HTTP ${login.status}).`);
const auth=await login.json();if(auth.user?.role!=='TEACHER'||!auth.accessToken)throw Error('Expected a teacher session.');
for(const path of ['/student/content-scope','/student/assignments','/student/mocks','/student/skills','/student/labs','/library']){
 if((await request(path,{headers:{Authorization:`Bearer ${auth.accessToken}`}})).status!==403)throw Error('Teacher access to a student-only curriculum route was not denied.');
}
if((await request('/student/content-scope')).status!==401)throw Error('Anonymous scope access was not denied.');
console.log('Verified live student-scope role restrictions. No records changed.');
