const base=(process.argv[2]??'https://assignments-hub-api.onrender.com/api/v1').replace(/\/$/,'');
for(let attempt=1;attempt<=30;attempt++){
 try{const r=await fetch(`${base}/learning-hub/capabilities`,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error(`HTTP ${r.status}`);const d=await r.json();if(d.recoveryLoopVersion!==1||d.engagementReportVersion!==1||d.pdfPages!==1)throw Error('Recovery loop and one-page reporting are not ready');console.log('PASS: learning recovery loop and one-page engagement reports ready.');process.exit(0)}catch(e){console.log(`Learning Hub ${attempt}/30: ${e.message}`)}
 if(attempt<30)await new Promise(r=>setTimeout(r,10000));
}
throw Error('Learning Hub backend is not ready; frontend publication blocked.');
