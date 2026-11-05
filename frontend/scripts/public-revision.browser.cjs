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
    if(width===390)await page.screenshot({path:`${artifacts}/${path.includes('mathematics')?'math':path.includes('science')?'science':'hub'}-mobile.png`,fullPage:false});
   }await context.close();
  }
  const context=await browser.newContext();const page=await context.newPage();const apiCalls=[];page.on('request',r=>{if(r.url().includes('/api/'))apiCalls.push(r.url());});
  await page.goto(base+'/revision/grade-7/mathematics/');const count=await page.locator('fieldset').count();assert(count>=10);
  for(const field of await page.locator('fieldset').all()){const answer=await field.getAttribute('data-answer');await field.locator(`input[value="${answer}"]`).check();}
  await page.getByRole('button',{name:'Check my answers',exact:true}).click();await page.getByRole('status').filter({hasText:`You scored ${count} out of ${count}`}).waitFor();
  assert.equal(await page.locator('details[open]').count(),count);await page.getByRole('button',{name:'Try again',exact:true}).click();assert.equal(await page.locator('input:checked').count(),0);assert.equal(apiCalls.length,0);
  console.log('Public revision browser checks passed: no-JavaScript HTML, four widths, scoring, explanations, retry, no API calls.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
