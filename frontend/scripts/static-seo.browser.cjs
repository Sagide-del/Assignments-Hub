const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { mkdirSync } = require('node:fs');
const { join } = require('node:path');
const base = process.env.AUTH_UI_BASE_URL || 'http://127.0.0.1:4196';
(async () => {
  const browser = await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.AUTH_CHROMIUM_EXECUTABLE ? {executablePath:process.env.AUTH_CHROMIUM_EXECUTABLE} : {})});
  try {
    const nojs = await browser.newContext({javaScriptEnabled:false,viewport:{width:1440,height:1000}});
    const page = await nojs.newPage();
    const home = await page.goto(base+'/');
    assert.equal(home.status(),200);
    await page.getByRole('heading',{level:1}).waitFor();
    const lungs=page.locator('#home-product-image img');
    assert.equal(await lungs.getAttribute('src'),'/product-previews/respiratory.webp');
    assert(await lungs.evaluate(image=>image.complete && image.naturalWidth>0));
    for (const [path,title] of [['/login','Login'],['/login?account=independent','Login'],['/login/staff','Login'],['/school/DEMO-001/login','Login'],['/register','Create Account']]) {
      const response=await page.goto(base+path);
      assert.equal(response.status(),200,path);
      assert.equal(await page.title(),`${title} | Assignment Hub Kenya`);
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex, nofollow');
      assert.equal(await page.locator('script[type="application/ld+json"]').count(),0);
    }
    for (const path of ['/this-page-does-not-exist','/revision/grade-10/audit-missing-subject/','/assets/missing-audit.js']) {
      const response=await page.goto(base+path);
      assert.equal(response.status(),404,path);
      await page.getByRole('heading',{level:1}).waitFor();
    }
    const context=await browser.newContext();
    await context.route('**/api/v1/**',r=>r.fulfill({json:[]}));
    const interactive=await context.newPage();
    const errors=[];interactive.on('pageerror',e=>errors.push(e.message));
    await interactive.goto(base+'/');
    await interactive.getByRole('link',{name:'Sign in',exact:true}).click();
    await interactive.getByRole('heading',{name:'School learner log in',exact:true}).waitFor();
    assert.equal(await interactive.title(),'Login | Assignment Hub Kenya');
    assert.equal(await interactive.locator('meta[name="robots"]').getAttribute('content'),'noindex, nofollow');
    await interactive.getByRole('link',{name:'Create Account',exact:true}).click();
    assert.equal(await interactive.title(),'Create Account | Assignment Hub Kenya');
    await interactive.getByRole('link',{name:'Home',exact:true}).click();
    await interactive.getByRole('heading',{level:1}).waitFor();
    assert((await interactive.title()).includes('CBC Revision'));
    assert((await interactive.locator('meta[name="robots"]').getAttribute('content')).startsWith('index,'));
    assert.equal(await interactive.locator('script[type="application/ld+json"]').count(),1);
    // Direct account load -> client-side Home must restore homepage schema too.
    await interactive.goto(base+'/login?account=independent');
    await interactive.getByRole('heading',{name:'Independent learner log in',exact:true}).waitFor();
    await interactive.getByRole('link',{name:'Home',exact:true}).click();
    await interactive.getByRole('heading',{level:1}).waitFor();
    assert.equal(await interactive.locator('script[type="application/ld+json"]').count(),1);
    for(const width of [1440,390,320]) {
      await interactive.setViewportSize({width,height:844});
      await interactive.goto(base+'/audit-missing-page');
      await interactive.getByRole('heading',{level:1}).waitFor();
      assert.equal(await interactive.title(),'Page Not Found | Assignment Hub Kenya');
      assert(await interactive.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      if(process.env.AUTH_UI_ARTIFACT_DIR){mkdirSync(process.env.AUTH_UI_ARTIFACT_DIR,{recursive:true});await interactive.screenshot({path:join(process.env.AUTH_UI_ARTIFACT_DIR,`404-${width}.png`)});}
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: no-JS homepage/lungs, unique noindex account HTML, actual HTTP 404s, client-side metadata/schema transitions and responsive 404.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
