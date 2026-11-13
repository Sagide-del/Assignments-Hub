const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const {mkdirSync} = require('node:fs');
const base=process.env.AUTH_UI_BASE_URL||'http://127.0.0.1:4198';
const artifacts=process.env.AUTH_UI_ARTIFACT_DIR||'/tmp/public-revision-browser';mkdirSync(artifacts,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.AUTH_CHROMIUM_EXECUTABLE?{executablePath:process.env.AUTH_CHROMIUM_EXECUTABLE}:{})});
 try{
  for(const width of [1440,768,390,320]){
   const context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled:false});const page=await context.newPage();
   for(const path of ['/free-revision/','/revision/grade-7/mathematics/','/revision/grade-7/integrated-science/']){
    const response=await page.goto(base+path);assert.equal(response.status(),200);assert(await page.locator('h1').isVisible());
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`No horizontal overflow: ${path} at ${width}`);
    if(path==='/free-revision/'){assert.equal(await page.locator('.unavailable').count(),0);assert(await page.locator('.subject.available').count()>0);assert.equal(await page.locator('details[open]').count(),0);if(width===390)assert(await page.evaluate(()=>document.documentElement.scrollHeight/innerHeight<5));}
    if(width===390)await page.screenshot({path:`${artifacts}/${path.includes('mathematics')?'math':path.includes('science')?'science':'hub'}-mobile.png`,fullPage:false});
   }await context.close();
  }
  const context=await browser.newContext();const page=await context.newPage();const apiCalls=[],events=[];await context.route('**/analytics/acquisition/events',async route=>{const headers={'access-control-allow-origin':'*','access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type'};if(route.request().method()==='OPTIONS'){await route.fulfill({status:204,headers});return;}events.push(route.request().postDataJSON());await route.fulfill({status:202,headers,json:{accepted:true}});});page.on('request',r=>{if(r.url().includes('/api/')&&!r.url().includes('/analytics/acquisition/events'))apiCalls.push(r.url());});
  await page.goto(base+'/revision/grade-7/mathematics/');const count=await page.locator('fieldset').count();assert(count>=3);
  for(const field of await page.locator('fieldset').all()){const answer=await field.getAttribute('data-answer');await field.locator(`input[value="${answer}"]`).check();}
  await page.getByRole('button',{name:'Check my answers',exact:true}).click();await page.getByRole('status').filter({hasText:`You scored ${count} out of ${count}`}).waitFor();
  assert.equal(await page.locator('details[open]').count(),count);await page.getByRole('button',{name:'Try again',exact:true}).click();assert.equal(await page.locator('input:checked').count(),0);assert.equal(apiCalls.length,0);await page.waitForFunction(()=>sessionStorage.getItem('ah-acquisition-v1:practice_complete')==='1');assert.deepEqual(events.map(e=>e.stage).sort(),['practice_complete','practice_start']);for(const event of events)assert.deepEqual(Object.keys(event).sort(),['path','session','stage']);
  console.log('Public revision browser checks passed: no-JavaScript HTML, four widths, scoring, explanations, retry, anonymous stage counts without answers or scores.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
