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
   await page.goto(base+'/blog/');assert.equal(await page.locator('.topic-icon [data-lucide]').count(),7);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:artifacts+'/research-index-'+width+'.png',fullPage:true});
   for(const slug of ['csl-ideas-for-students','core-vs-essential-mathematics','kjsea-past-papers-and-mocks','cbc-grading-levels-explained','senior-school-pathways-cbc','grade-7-mathematics-revision-help','career-compass-kenyan-students']){
    assert.equal((await page.goto(base+'/blog/'+slug+'/')).status(),200);assert(await page.locator('h1').isVisible());
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Article overflow: ${slug} ${width}`);
    const takeaway=await page.locator('.key-takeaways').boundingBox(),answer=await page.locator('.article>.quick-answer').boundingBox(),cta=await page.locator('.topic-cta').boundingBox();
    assert.equal(await page.locator('.research-insight').count(),1);assert.equal(await page.locator('.career-pathway').count(),1);assert.equal(await page.locator('.topic-cta').count(),1);
    assert.equal(await page.locator('[data-lucide="Lightbulb"]').count(),1);
    const text=await page.locator('body').innerText();assert(text.trim().split(/\s+/).length<=400,`400-word cap: ${slug}`);
    if(width===390){assert(takeaway.x>=16,'Mobile reading gutter');assert(takeaway.y+takeaway.height<=cta.y);assert(cta.y+cta.height<=answer.y);}
    else{assert(cta.x>takeaway.x+takeaway.width);}
    if(slug.startsWith('csl'))assert(await page.getByRole('link',{name:'Ten-project CSL planner'}).isVisible());
    if(slug.startsWith('core'))assert.equal(await page.locator('.comparison-scroll table').count(),1);
    if(slug.startsWith('kjsea'))assert(await page.getByRole('link',{name:'Start Grade 9 practice'}).isVisible());
    if(slug.startsWith('career'))assert.equal(await page.getByRole('link',{name:'Try the Career Compass for your child'}).getAttribute('href'),'/student/my-pathway');
    if(slug.startsWith('career')||slug.startsWith('csl'))await page.screenshot({path:artifacts+'/research-'+slug+'-'+width+'.png',fullPage:true});
   }
   await page.goto(base+'/guides/csl-project-planner/');assert.equal(await page.locator('.csl-project').count(),10);
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
  await context.close();console.log('PASS: public article layouts, topic CTAs, research citations, 400-word caps, early mobile CTAs, seven Lucide themes, ten CSL projects, maths comparison, linked KJSEA samples, real lab previews, first-touch source and English practice.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
