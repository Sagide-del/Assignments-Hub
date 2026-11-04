// Read-only production smoke test. No school marks are imported or changed.
const base=(process.env.RBAC_API_URL||'https://assignments-hub-api.onrender.com/api/v1').replace(/\/$/,'');
if(!base.startsWith('https://'))throw Error('Production access checks require HTTPS.');
if(!process.env.DEMO_TEACHER_PASSWORD)throw Error('Configure the demo teacher password securely.');
const request=(path,options={})=>fetch(base+path,{...options,redirect:'error',signal:AbortSignal.timeout(20000)});
const login=await request('/auth/staff/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({schoolCode:'DEMO-001',email:'otieno@demo.co.ke',password:process.env.DEMO_TEACHER_PASSWORD})});
if(!login.ok)throw Error(`Demo login failed (HTTP ${login.status}).`);
const auth=await login.json();
if(auth.user?.role!=='TEACHER'||!auth.accessToken)throw Error('Expected a teacher session.');
const headers={Authorization:`Bearer ${auth.accessToken}`};
for(const [path,method] of [['/sba/import/template','GET'],['/sba/import/upload','POST'],['/sba/import/merge','POST']]){
 if((await request(path,{method,headers})).status!==403)throw Error('Teacher access to school-only mock import was not denied.');
}
const classesResponse=await request('/teacher/classes',{headers});
if(!classesResponse.ok)throw Error('Could not read assigned classes.');
const classes=await classesResponse.json();
if(classes.length!==1)throw Error('Unexpected demo teacher class scope.');
const report=await request(`/sba/teaching/${encodeURIComponent(classes[0].id)}`,{headers});
if(!report.ok)throw Error('Scoped SBA scorebook did not load.');
const body=await report.json();
if(body.rows.length!==1||body.rows[0].admission_number!=='VH001'||!Object.hasOwn(body.rows[0],'external_mock'))throw Error('Scoped SBA report did not return Victor only with external-mock support.');
if((await request(`/sba/student/${Number(process.env.RBAC_ALICE_ID)}`,{headers})).status!==403)throw Error('Cross-stream SBA access was not denied.');
console.log('Verified live SBA import restrictions, scoped scorebook and cross-stream denial. No scores changed.');
