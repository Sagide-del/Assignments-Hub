// Does not create learner logs, approve hours or call AI. A tiny private diagnostic photo is uploaded, read and removed.
const base=(process.env.RBAC_API_URL||'https://assignments-hub-api.onrender.com/api/v1').replace(/\/$/,'');
if(!base.startsWith('https://')||!process.env.DEMO_TEACHER_PASSWORD)throw Error('HTTPS and configured demo verification credentials are required.');
const request=(path,options={})=>fetch(base+path,{...options,redirect:'error',signal:AbortSignal.timeout(20000)});
const response=await request('/auth/staff/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({schoolCode:'DEMO-001',email:'otieno@demo.co.ke',password:process.env.DEMO_TEACHER_PASSWORD})});
if(!response.ok)throw Error(`Demo teacher login failed (HTTP ${response.status}).`);
const auth=await response.json();if(auth.user?.role!=='TEACHER'||!auth.accessToken)throw Error('Expected a teacher session.');
const headers={Authorization:`Bearer ${auth.accessToken}`};
const rosterResponse=await request('/teacher/students',{headers});if(!rosterResponse.ok)throw Error('Could not load assigned roster.');const roster=await rosterResponse.json();
const pending=await request('/csl/pending',{headers});if(!pending.ok)throw Error('CSL approval queue failed to load.');const body=await pending.json();
if(!Array.isArray(body.logs)||body.logs.some(log=>!roster.some(student=>student.id===log.student_id)))throw Error('CSL approval queue contains learners outside the assigned roster.');
const alice=Number(process.env.RBAC_ALICE_ID);if(!Number.isSafeInteger(alice)||alice<=0)throw Error('Configure the existing Alice verification ID.');
if((await request(`/csl/${alice}/logbook-pdf`,{headers})).status!==403)throw Error('Cross-stream CSL PDF access was not denied.');
if((await request('/csl/my-hours',{headers})).status!==403)throw Error('Teacher access to learner-only logbook route was not denied.');
const storage=await request('/csl/storage-check',{method:'POST',headers});
const storageResult=await storage.json().catch(()=>null);
if(storageResult?.photo_storage_verified!==true||storageResult?.diagnostic_cleanup_verified!==true){
 const stage=storageResult?.failure_stage||'UNKNOWN';
 const message=`Live private CSL photo verification failed (HTTP ${storage.status}, stage ${stage}).`;
 console.error(`::error title=CSL photo storage::${message}`);
 throw Error(message);
}
console.log('Verified live private photo upload/read and CSL assigned-stream queue, cross-stream PDF denial and role restrictions. No learner data changed.');
