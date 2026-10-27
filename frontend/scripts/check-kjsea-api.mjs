// Deployment gate: the public blueprint probes the new database table.
const base=(process.argv[2]??'https://assignments-hub-api.onrender.com/api/v1').replace(/\/$/,'');
for(let attempt=1;attempt<=24;attempt++){
 try{
  const response=await fetch(`${base}/kjsea/blueprint`,{signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const data=await response.json();
  if(data.version!=='kjsea-maths-v1'||data.questionCount!==40||data.topicCount!==32||data.visualCount!==20||data.gradeSelection!==true||data.seniorMocks!==true||data.assessmentWorkspaceVersion!==2)throw new Error('Unexpected mock blueprint');
  console.log('PASS: KJSEA API and attempt storage are ready.');process.exit(0);
 }catch(error){console.log(`KJSEA readiness ${attempt}/24: ${error.message}`);}
 if(attempt<24)await new Promise(resolve=>setTimeout(resolve,10000));
}
console.error('KJSEA API did not become ready. Frontend publication must wait for the Render deployment/migration.');process.exit(1);
