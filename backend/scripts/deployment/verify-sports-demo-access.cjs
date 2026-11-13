#!/usr/bin/env node
// Read-only production check. The PIN is delivered privately to the account owner.
(async()=>{
 const base=process.env.API_BASE_URL||'https://assignments-hub-api.onrender.com/api/v1';let last='Backend has not answered yet.';
 for(let attempt=0;attempt<60;attempt++){
  try{const r=await fetch(base+'/student/sports-lab/capabilities',{signal:AbortSignal.timeout(10000)}),data=await r.json();
   if(r.ok&&data.ready===true&&data.simulations===5&&data.demoReady===true){console.log(JSON.stringify({verified:true,schoolCode:'SPORTSDEMO',admissionNumber:'SPORTS1001',grade:'Grade 10',role:'STUDENT',activities:['skeletal','muscle','energy','respiratory','reflex']},null,2));return;}
   last=`HTTP ${r.status}; progress storage ready: ${data.ready===true}; demo configured: ${data.demoReady===true}`;
  }catch{last='Backend is restarting or not reachable yet.';}
  if(attempt%6===0)console.log('Waiting for the requested Sports demo to be provisioned…');
  await new Promise(resolve=>setTimeout(resolve,5000));
 }
 throw Error('The Grade 10 Sports demo is not ready. '+last);
})().catch(e=>{console.error(e.message);if(process.env.GITHUB_ACTIONS==='true')console.log(`::error title=Sports demo readiness::${e.message.replace(/%/g,'%25').replace(/\n/g,'%0A')}`);process.exitCode=1;});
