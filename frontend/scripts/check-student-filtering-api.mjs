const base=(process.env.VITE_API_URL||'https://assignments-hub-api.onrender.com/api/v1').replace(/\/$/,'');
let ready=false;
for(let n=0;n<30;n++){
 try{const r=await fetch(base+'/student/content-capabilities',{signal:AbortSignal.timeout(10000)});if(r.ok&&(await r.json()).studentFilteringVersion===2){ready=true;break;}}catch{/* Rolling deployment. */}
 if(n<29)await new Promise(r=>setTimeout(r,5000));
}
if(!ready)throw Error('Student curriculum filtering must be ready before publishing.');
console.log('Student grade/pathway/track filtering API is ready.');
