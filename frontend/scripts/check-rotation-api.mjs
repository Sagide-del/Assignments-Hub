const base=(process.env.VITE_API_URL||'https://assignments-hub-api.onrender.com/api/v1').replace(/\/$/,'');
let ready=false;
for(let n=0;n<30;n++){
 try{const r=await fetch(base+'/student/rotation-capabilities',{signal:AbortSignal.timeout(10000)});if(r.ok){const b=await r.json();if(b.cheatsheetVersion===1&&b.rotationVersion===1){ready=true;break;}}}catch{/* Bounded wait for backend code and migration. */}
 if(n<29)await new Promise(r=>setTimeout(r,5000));
}
if(!ready)throw Error('Cheat-sheet columns and automatic batch-number migration must be ready before publication.');
console.log('Phase 1 cheat sheets and batch rotation API/schema are ready.');
