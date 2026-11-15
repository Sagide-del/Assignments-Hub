const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {mkdirSync}=require('node:fs');
const base=process.env.AUTH_UI_BASE_URL||'http://127.0.0.1:4196';
const artifacts=process.env.AUTH_UI_ARTIFACT_DIR||'/tmp/seo-conversion-browser';mkdirSync(artifacts,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.AUTH_CHROMIUM_EXECUTABLE?{executablePath:process.env.AUTH_CHROMIUM_EXECUTABLE}:{})});
 try{
  for(const width of [390,1280]){
   const context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled:false});const page=await context.newPage();
   for(const slug of ['csl-ideas-for-students','core-vs-essential-mathematics','kjsea-past-papers-and-mocks']){
    assert.equal((await page.goto(base+'/blog/'+slug+'/')).status(),200);assert(await page.locator('h1').isVisible());
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Article overflow: ${slug} ${width}`);
    const takeaway=await page.locator('.key-takeaways').boundingBox(),answer=await page.locator('.article>.quick-answer').boundingBox();
    assert(takeaway.y<answer.y);
    if(width===390){const cta=await page.locator('.mobile-topic-cta').boundingBox();assert(answer.y<cta.y);assert(!(await page.locator('.sidebar').isVisible()));}
    else{assert(await page.locator('.sidebar').isVisible());const side=await page.locator('.sidebar').boundingBox();assert(side.x>takeaway.x+takeaway.width);}
    if(slug.startsWith('csl'))assert.equal(await page.locator('.csl-project').count(),10);
    if(slug.startsWith('core'))assert.equal(await page.locator('.comparison-scroll table').count(),1);
    if(slug.startsWith('kjsea'))assert.equal(await page.locator('.sample-question').count(),5);
   }
   for(const kind of ['sports','music']){
    await page.goto(base+'/labs/'+kind+'/preview/');assert(await page.getByText('Sign in to interact',{exact:false}).isVisible());
    const href=await page.locator('.preview-screen image').getAttribute('href');assert(href.includes('/product-previews/'));assert.equal((await context.request.get(base+href)).status(),200);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   }
   await page.screenshot({path:artifacts+'/seo-preview-'+width+'.png',fullPage:true});await context.close();
  }
  const context=await browser.newContext();await context.route('**/api/**',r=>r.fulfill({status:200,json:{}}));const page=await context.newPage();
  await page.goto(base+'/blog/csl-ideas-for-students/');await page.waitForFunction(()=>document.cookie.includes('ah_landing_source='));
  assert.equal(decodeURIComponent((await context.cookies()).find(c=>c.name==='ah_landing_source').value),'blog/csl-ideas-for-students');
  await page.goto(base+'/blog/core-vs-essential-mathematics/');assert.equal(decodeURIComponent((await context.cookies()).find(c=>c.name==='ah_landing_source').value),'blog/csl-ideas-for-students');
  await page.goto(base+'/revision/grade-7/english/');assert.equal(await page.locator('fieldset').count(),5);
  for(const field of await page.locator('fieldset').all())await field.locator(`input[value="${await field.getAttribute('data-answer')}"]`).check();
  await page.getByRole('button',{name:'Check my answers',exact:true}).click();await page.getByRole('status').filter({hasText:'You scored 5 out of 5'}).waitFor();
  await page.goto(base+'/revision/grade-9/');assert(await page.getByRole('link',{name:/Mathematics/}).first().isVisible());
  await context.close();console.log('PASS: public article layouts, topic CTAs, ten CSL projects, maths comparison, five KJSEA samples, real lab previews, first-touch source and English practice.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
