const base=(process.argv[2]??'https://assignments-hub-api.onrender.com/api/v1').replace(/\/$/,'');
for(let attempt=1;attempt<=30;attempt++){
 try{const r=await fetch(`${base}/skills/capabilities`,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error(`HTTP ${r.status}`);const d=await r.json();if(d.focusedSkillsVersion!==1||d.activeLimit!==2||d.workbooksVersion!==1||d.curatedMusicCourses<2)throw Error('Focused skills migration or curated courses not ready');console.log('PASS: focused skills API, two-skill policy, workbooks and music courses ready.');process.exit(0)}catch(e){console.log(`Focused skills ${attempt}/30: ${e.message}`)}
 if(attempt<30)await new Promise(r=>setTimeout(r,10000));
}
throw Error('Focused skills backend is not ready; frontend publication blocked.');
