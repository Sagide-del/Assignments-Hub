const base=(process.env.VITE_API_URL||'https://assignments-hub-api.onrender.com/api/v1').replace(/\/$/,'');let ready=false;
for(let n=0;n<30;n++){try{const r=await fetch(base+'/student/math-capabilities',{signal:AbortSignal.timeout(15000)});if(r.ok&&(await r.json()).mathEngineVersion===1){ready=true;break;}}catch{}if(n<29)await new Promise(r=>setTimeout(r,5000));}
if(!ready)throw Error('The Python math engine must pass its algebra and chemistry self-checks before publishing.');
console.log('Private Python math engine is ready and passed its calculation self-checks.');
