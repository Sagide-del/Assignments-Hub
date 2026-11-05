const base=(process.env.API_URL||'https://assignments-hub-api.onrender.com/api/v1').replace(/\/$/,'');
let ready=false;
for(let i=0;i<60;i++){
 try{const r=await fetch(`${base}/cms/capabilities`,{signal:AbortSignal.timeout(10000)});const data=await r.json();if(r.ok&&data.distributionVersion===1){ready=true;break;}}catch{}
 await new Promise(r=>setTimeout(r,5000));
}
if(!ready)throw Error('CMS distribution migration and API must be ready before frontend publishing.');
console.log('CMS distribution API and storage ready.');
