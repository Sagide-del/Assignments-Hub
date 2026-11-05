const base=(process.env.VITE_API_URL||'https://assignments-hub-api.onrender.com/api/v1').replace(/\/$/,'');let ready=false;
for(let n=0;n<30;n++){try{const r=await fetch(base+'/student/assignment-capabilities',{signal:AbortSignal.timeout(10000)});if(r.ok&&(await r.json()).studentElectivesVersion===1){ready=true;break;}}catch{}if(n<29)await new Promise(r=>setTimeout(r,5000));}
if(!ready)throw Error('Student elective-subject column and assignment filtering API must be ready before publication.');
console.log('Student electives migration and assignment filtering API are ready.');
