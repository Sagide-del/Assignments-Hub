const {chromium}=require('playwright');const assert=require('node:assert/strict');const {mkdirSync}=require('node:fs');
const base=process.env.AUTH_UI_BASE_URL||'http://127.0.0.1:4252',art=process.env.AUTH_UI_ARTIFACT_DIR||'/tmp/instrument-workspaces';mkdirSync(art,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.AUTH_CHROMIUM_EXECUTABLE?{executablePath:process.env.AUTH_CHROMIUM_EXECUTABLE}:{})});try{
 const ctx=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 await ctx.addInitScript(()=>localStorage.setItem('assignments-hub-auth',JSON.stringify({state:{accessToken:'fixture',refreshToken:'fixture',accessTokenExpiresAt:Date.now()+3600000,user:{id:10,schoolId:2,role:'STUDENT',name:'Music learner',grade:'Grade 10',isIndependentTrial:false}},version:0})));
 const writes=[];await ctx.route('**/api/v1/**',async route=>{const path=new URL(route.request().url()).pathname;if(route.request().method()!=='GET')writes.push(path);let data=[];
 if(path.endsWith('/student/lab-config'))data={label:'Music Studio',route:'/student/labs/music',category:'ARTS_MUSIC',icon:'Music'};
 else if(path.endsWith('/student/content-scope'))data={grade:10,pathway:'Arts & Sports',track:'Performing Arts',subjects:['Music & Dance'],availability:{labs:0,skills:0,csl:true},setup_required:false};
 await route.fulfill({json:data});});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/student/labs/music/guitar');await page.getByRole('heading',{name:'Guitar Studio',exact:true}).waitFor();
 assert.equal(await page.locator('nav[aria-label="Music modules"] a').count(),4);
 await page.getByRole('button',{name:'Pluck E4 string',exact:true}).click();
 await page.getByRole('button',{name:'Coastal breeze',exact:true}).click();assert.equal(await page.getByLabel('Tempo',{exact:true}).inputValue(),'102');
 await page.getByLabel('Bar 1 chord',{exact:true}).selectOption('Dm');
 const note=page.getByRole('button',{name:'C5 step 2',exact:true});const before=await note.getAttribute('aria-pressed');await note.click();assert.notEqual(await note.getAttribute('aria-pressed'),before);
 await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await note.getAttribute('aria-pressed'),before);
 await page.getByRole('button',{name:'Play loop',exact:true}).click();await page.getByRole('button',{name:'Stop',exact:true}).waitFor();await page.getByText(/Playing · bar/).waitFor();await page.getByRole('button',{name:'Stop',exact:true}).click();
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Download WAV',exact:true}).click();const download=await downloaded;assert(download.suggestedFilename().endsWith('.wav'));const file=await download.path();const bytes=require('node:fs').readFileSync(file);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert(bytes.length>100000);
 // The browser itself decodes the export; verify audible sample energy.
 const samples=await page.evaluate(async data=>{const ac=new AudioContext();try{const b=await ac.decodeAudioData(Uint8Array.from(data).buffer);const s=b.getChannelData(0);return {duration:b.duration,energy:s.reduce((n,v)=>n+v*v,0)/s.length};}finally{await ac.close();}},[...bytes]);assert(samples.energy>1e-5);assert(samples.duration>8);
 await page.reload();await page.getByLabel('Bar 1 chord',{exact:true}).waitFor();assert.equal(await page.getByLabel('Bar 1 chord',{exact:true}).inputValue(),'Dm');
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:art+'/guitar-'+width+'.png',fullPage:true});}
 await page.getByRole('link',{name:'Drums',exact:true}).click();await page.getByRole('heading',{name:'Drum Studio',exact:true}).waitFor();
 for(const name of ['Kick','Snare','Closed hat','Open hat','Low tom','High tom','Clap','Shaker'])await page.getByRole('button',{name,exact:true}).first().click();
 await page.getByRole('button',{name:'Dancehall pulse',exact:true}).click();assert.equal(await page.getByLabel('Tempo',{exact:true}).inputValue(),'100');
 const hit=page.getByRole('button',{name:'Kick step 1',exact:true});assert.equal(await hit.getAttribute('aria-pressed'),'true');await hit.click();assert.equal(await hit.getAttribute('aria-pressed'),'false');await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await hit.getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'Play loop',exact:true}).click();await page.getByRole('button',{name:'Stop',exact:true}).waitFor();await page.getByRole('link',{name:'Guitar',exact:true}).click();await page.getByRole('button',{name:'Play loop',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Stop',exact:true}).count(),0);
 await page.getByRole('link',{name:'Drums',exact:true}).click();await page.getByRole('button',{name:'Clear pattern',exact:true}).click();assert.equal(await page.locator('[aria-label="Drum step sequencer"] button[aria-pressed="true"]').count(),0);
 await page.getByRole('button',{name:'One drop',exact:true}).click();await page.reload();await page.getByLabel('Tempo',{exact:true}).waitFor();assert.equal(await page.getByLabel('Tempo',{exact:true}).inputValue(),'82');
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:art+'/drums-'+width+'.png',fullPage:true});}
 assert.deepEqual(errors,[]);assert.deepEqual(writes.filter(path=>!path.endsWith('/presence/heartbeat')),[]);await ctx.close();console.log('PASS: three modules, guitar strings/chords/piano roll, eight drum pads, groove presets, edits/undo, looping/cleanup, scoped device drafts, decoded audible WAV, and 320/390/1440px layouts.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
