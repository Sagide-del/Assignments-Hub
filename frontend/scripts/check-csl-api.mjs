const base=(process.env.VITE_API_URL||'https://assignments-hub-api.onrender.com/api/v1').replace(/\/$/,'');
let ready=false,storageMissing=false;
for(let attempt=0;attempt<40;attempt++){
 try{const response=await fetch(`${base}/csl/capabilities`,{signal:AbortSignal.timeout(10000)});if(response.ok){const body=await response.json();if(body.cslVersion===1){if(body.photo_storage_configured!==true){storageMissing=true;break;}ready=true;break;}}}catch{}
 if(attempt<39)await new Promise(resolve=>setTimeout(resolve,5000));
}
if(storageMissing)throw Error('CSL backend is ready but private photo storage is not configured. Configure existing AWS_REGION and AWS_S3_BUCKET in Render; never paste access keys into logs.');
if(!ready)throw Error('CSL API and logbook migration must be ready before publishing the frontend.');
console.log('CSL logbook API/schema and photo storage configuration are ready.');
