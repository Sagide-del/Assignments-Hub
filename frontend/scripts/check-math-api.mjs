const base=(process.env.VITE_API_URL||'https://assignments-hub-api.onrender.com/api/v1').replace(/\/$/,'');
let ready=false,last='No response received';
for(let n=0;n<30;n++){
 try{
  const r=await fetch(base+'/student/math-capabilities',{signal:AbortSignal.timeout(15000)});
  const body=await r.json().catch(()=>null);
  if(r.ok&&body?.mathEngineVersion===1){ready=true;break;}
  const reported=typeof body?.code==='string'?body.code:typeof body?.message==='string'?body.message.match(/^(MATH_ENGINE_[A-Z_]+):/)?.[1]:null;
  const code=typeof reported==='string'&&/^MATH_ENGINE_[A-Z_]+$/.test(reported)?reported:null;
  last=`HTTP ${r.status}${code?` · ${code}`:''}`;
  if(r.status===404)last+=' · backend has not deployed the math capability route';
  console.log(`Math engine readiness ${n+1}/30: ${last}`);
 }catch(error){last=error?.name==='TimeoutError'?'Request timed out':'Network request failed';console.log(`Math engine readiness ${n+1}/30: ${last}`);}
 if(n<29)await new Promise(r=>setTimeout(r,5000));
}
if(!ready)throw Error(`Python math engine readiness failed (${last}). Check the latest Render backend install/build/startup logs. Publication remains blocked.`);
console.log('Private Python math engine passed its algebra and chemistry self-checks.');
