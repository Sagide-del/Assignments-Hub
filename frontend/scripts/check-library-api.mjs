const base=(process.env.VITE_API_URL||'https://assignments-hub-api.onrender.com/api/v1').replace(/\/$/,'');
let ready=false;
for(let n=0;n<30;n++){
 try{const r=await fetch(base+'/library/capabilities',{signal:AbortSignal.timeout(10000)});if(r.ok){const b=await r.json();if(b.studentLibraryVersion===1&&b.cheatSheetPdfVersion===1){ready=true;break;}}}catch{}
 if(n<29)await new Promise(r=>setTimeout(r,5000));
}
if(!ready)throw Error('Student library and cheat-sheet PDF backend must be ready before publishing.');
console.log('Student library and cheat-sheet PDF API are ready.');
