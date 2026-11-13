const base = (process.env.VITE_API_URL || 'https://assignments-hub-api.onrender.com/api/v1').replace(/\/$/,'');
let ready = false;
for (let attempt=0; attempt<30; attempt++) {
  try { const r=await fetch(`${base}/analytics/acquisition/capabilities`,{signal:AbortSignal.timeout(10000)});const d=await r.json();if(r.ok&&d.ready===true&&d.version===1){ready=true;break;} } catch {}
  await new Promise(resolve=>setTimeout(resolve,5000));
}
if(!ready) throw Error('Journey tracking backend is not ready; stop before publishing the instrumented frontend.');
console.log('PASS: live first-party journey tracking backend is ready.');
