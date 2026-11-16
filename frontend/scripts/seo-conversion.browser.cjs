const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {mkdirSync}=require('node:fs');
const base=process.env.AUTH_UI_BASE_URL||'http://127.0.0.1:4196';
const artifacts=process.env.AUTH_UI_ARTIFACT_DIR||'/tmp/seo-conversion-browser';mkdirSync(artifacts,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.AUTH_CHROMIUM_EXECUTABLE?{executablePath:process.env.AUTH_CHROMIUM_EXECUTABLE}:{})});
 try{
  for(const width of [320,390,1280]){
   const context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled:false,reducedMotion:'reduce'});const page=await context.newPage();
   await page.goto(base+'/blog/');assert.equal(await page.locator('.topic-icon [data-lucide]').count(),11);assert.equal(await page.locator('.editorial-cover img').count(),11);for(const cover of await page.locator('.editorial-cover img').all()){await cover.scrollIntoViewIfNeeded();await cover.waitFor({state:'visible'});await page.waitForFunction(img=>img.complete&&img.naturalWidth>0,await cover.elementHandle());}assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:artifacts+'/research-index-'+width+'.png',fullPage:true});
   for(const slug of ['csl-ideas-for-students','core-vs-essential-mathematics','kjsea-past-papers-and-mocks','cbc-grading-levels-explained','senior-school-pathways-cbc','grade-7-mathematics-revision-help','career-compass-kenyan-students','career-path-selection-guide','individualized-study-timetables','short-topic-based-tests','role-of-virtual-labs']){
    assert.equal((await page.goto(base+'/blog/'+slug+'/')).status(),200);assert(await page.locator('h1').isVisible());
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Article overflow: ${slug} ${width}`);
    assert.equal(await page.locator('.article-cover img').count(),1);const image=page.locator('.article-cover img');await image.scrollIntoViewIfNeeded();await page.waitForFunction(img=>img.complete&&img.naturalWidth>0,await image.elementHandle());await page.evaluate(()=>window.scrollTo(0,0));
    assert.equal(await page.locator('.research-insight').count(),1);assert.equal(await page.locator('.career-pathway').count(),1);assert.equal(await page.locator('.topic-cta').count(),1);assert(await page.locator('.topic-cta .button').isVisible(),'Topic CTA must remain visible');
    assert.equal(await page.locator('[data-lucide="Lightbulb"]').count(),1);
    const words=Number(await page.locator('[data-editorial-article]').getAttribute('data-word-count'));assert(words>=800&&words<=1200,`${slug}: ${words}`);
    for(const path of ['/revision/','/student/coach','/student/career'])assert(await page.locator('[data-article-copy] a[href="'+path+'"]').count()>0);
    assert.equal(await page.locator('footer nav[aria-label="Popular Guides"] a').count(),5);
    for(const shot of await page.locator('.product-evidence img').all()){await shot.scrollIntoViewIfNeeded();await page.waitForFunction(img=>img.complete&&img.naturalWidth>0,await shot.elementHandle());}
    assert.equal(await page.locator('.key-takeaways li').count(),3);assert.equal(await page.locator('.related-guide-card').count(),4);
    assert(await page.locator('.brand-introduction').isVisible());assert.equal(await page.locator('.brand-introduction a').getAttribute('href'),'/about/');
    assert((await page.locator('[data-article-copy] a[href^="/blog/"]').count())>=2,'Contextual internal links: '+slug);
    const headings=await page.locator('[data-editorial-article] h2,[data-editorial-article] h3').evaluateAll(nodes=>nodes.map(n=>n.id));const anchors=await page.locator('.article-toc a').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href').slice(1)));assert.deepEqual(anchors,headings);assert.equal(new Set(headings).size,headings.length);
    await page.locator('.article-toc summary').click();assert(await page.locator('.article-toc a').first().isVisible());await page.locator('.article-toc a').first().click();assert(new URL(page.url()).hash.length>1);
    const faqCount=await page.locator('.guide-faq details').count();assert(faqCount>=3&&faqCount<=5);for(const faq of await page.locator('.guide-faq details').all()){await faq.locator('summary').scrollIntoViewIfNeeded();await faq.locator('summary').click();assert(await faq.locator('p').isVisible());}
    if(slug.startsWith('csl')){assert.equal(await page.locator('.csl-examples li').count(),10);assert(await page.getByRole('link',{name:'Ten-project CSL planner',exact:true}).isVisible());}
    if(slug.startsWith('core'))assert.equal(await page.locator('.comparison-scroll table').count(),1);
    if(slug.startsWith('kjsea'))assert(await page.getByRole('link',{name:'Start Grade 9 practice',exact:true}).isVisible());
    if(slug==='career-compass-kenyan-students'){assert.equal(await page.getByRole('link',{name:'Try Career Compass',exact:true}).getAttribute('href'),'/student/career');assert.equal(await page.locator('.career-layer-card').count(),3);assert.equal(await page.getByRole('checkbox').count(),5);await page.getByRole('checkbox').first().check();assert(await page.getByRole('checkbox').first().isChecked());}
    if(slug.startsWith('career')||slug.startsWith('csl')||slug.startsWith('core')||slug.startsWith('senior'))await page.screenshot({path:artifacts+'/research-'+slug+'-'+width+'.png',fullPage:true});
   }
   await page.goto(base+'/guides/csl-project-planner/');assert.equal(await page.locator('.csl-project').count(),10);
   for(const kind of ['sports','music']){
    await page.goto(base+'/labs/'+kind+'/preview/');assert(await page.getByText('Sign in to interact',{exact:false}).isVisible());
    const href=await page.locator('.preview-screen image').getAttribute('href');assert(href.includes('/product-previews/'));assert.equal((await context.request.get(base+href)).status(),200);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   }
   await page.screenshot({path:artifacts+'/seo-preview-'+width+'.png',fullPage:true});await context.close();
  }
  const context=await browser.newContext({reducedMotion:'reduce'});await context.route('**/api/**',r=>r.fulfill({status:200,json:{}}));const page=await context.newPage();
  await page.goto(base+'/blog/csl-ideas-for-students/');await page.waitForFunction(()=>document.cookie.includes('ah_landing_source='));
  assert.equal(decodeURIComponent((await context.cookies()).find(c=>c.name==='ah_landing_source').value),'blog/csl-ideas-for-students');
  await page.goto(base+'/blog/core-vs-essential-mathematics/');assert.equal(decodeURIComponent((await context.cookies()).find(c=>c.name==='ah_landing_source').value),'blog/csl-ideas-for-students');
  await page.goto(base+'/blog/career-compass-kenyan-students/');const progress=page.locator('#career-checklist-progress');await progress.filter({hasText:'0 of 5'}).waitFor();for(const box of await page.getByRole('checkbox').all())await box.check();await progress.filter({hasText:'5 of 5'}).waitFor();await page.getByRole('button',{name:'Reset checklist'}).click();assert.equal(await page.locator('.career-checklist input:checked').count(),0);await page.getByRole('link',{name:'Try Career Compass',exact:true}).click();await page.waitForURL(/\/login/);
  await page.goto(base+'/revision/grade-7/english/');assert.equal(await page.locator('fieldset').count(),5);
  for(const field of await page.locator('fieldset').all())await field.locator(`input[value="${await field.getAttribute('data-answer')}"]`).check();
  await page.getByRole('button',{name:'Check my answers',exact:true}).click();await page.getByRole('status').filter({hasText:'You scored 5 out of 5'}).waitFor();
  await page.goto(base+'/revision/grade-9/');assert(await page.getByRole('link',{name:/Mathematics/}).first().isVisible());
  await context.close();console.log('PASS: public article layouts, topic CTAs, research citations, 800–1,200-word guides, generated TOCs, related grids, topic CTAs, eleven themed Lucide covers, ten CSL projects, maths comparison, linked KJSEA samples, real lab previews, first-touch source and English practice.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
