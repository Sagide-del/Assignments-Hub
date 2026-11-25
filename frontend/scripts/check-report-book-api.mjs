const base=(process.argv[2]??'https://assignments-hub-api.onrender.com/api/v1').replace(/\/$/,'');
for(let i=1;i<=30;i++){
 try{const response=await fetch(base+'/report-book/capabilities',{signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('HTTP '+response.status);const d=await response.json();if(d.reportBookVersion!==1||d.publicationWorkflowVersion!==1)throw Error('Report Book migration or API not ready');console.log('PASS: Report Book schema, grading/publication API ready.');console.log(`::notice title=Report Book demo::Demo staff credentials configured and active: ${d.demoStaffReady===true}`);process.exit(0);}catch(e){console.log(`Report Book ${i}/30: ${e.message}`)}
 if(i<30)await new Promise(r=>setTimeout(r,10000));
}
throw Error('Report Book backend is not ready. Frontend publication blocked.');
