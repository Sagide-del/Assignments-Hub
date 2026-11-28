const base=(process.env.VITE_API_URL||'https://assignments-hub-api.onrender.com/api/v1').replace(/\/$/,'');
let ready=false;
for(let n=0;n<30;n++){
 try{const r=await fetch(base+'/student/rotation-capabilities',{signal:AbortSignal.timeout(10000)});if(r.ok){const b=await r.json();if(b.cheatsheetVersion===1&&b.rotationVersion===1&&b.cheatsheetDesignVersion===2&&b.automaticDiagramVersion===1){ready=true;break;}}}catch{/* Bounded wait for backend code and migration. */}
 if(n<29)await new Promise(r=>setTimeout(r,5000));
}
if(!ready)throw Error('The new visual cheat-sheet backend and batch rotation migration must be ready before publication. Check the latest backend deployment.');
console.log('Visual cheat-sheet design v2, automatic diagram generation and batch rotation API/schema are ready.');
