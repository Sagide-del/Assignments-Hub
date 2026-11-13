import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { appShell, routeMetadata } from './static-pages.mjs';
import { spaRoutes, routeRequest, generateRouting } from './generate-routing.mjs';
const source = await readFile(new URL('../src/app/router/index.tsx', import.meta.url), 'utf8');
const template = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const routes = { pages: {'/':'/index.html','/revision/grade-7/mathematics':'/revision/grade-7/mathematics/index.html'}, spa: spaRoutes(source), notFound:'<h1>404</h1>' };

test('account metadata exists in initial HTML for login/register and their variants', () => {
  for (const [path, title] of [['/login','Login'],['/login/staff','Login'],['/school/DEMO-001/login','Login'],['/register','Create Account']]) {
    const html = appShell(template,path);
    assert(html.includes(`<title>${title} | Assignment Hub Kenya</title>`));
    assert(html.includes('name="robots" content="noindex, nofollow"'));
    assert(!html.includes('type="application/ld+json"'));
    assert(!html.includes('rel="canonical" href="https://assignmenthub.co.ke/"'));
  }
  assert.equal(routeMetadata('/login/').title,'Login | Assignment Hub Kenya');
  assert.equal(routeMetadata('/').robots,'index, follow, max-image-preview:large');
});
test('valid role and parameterised app URLs retain the separate app shell', () => {
  for(const path of ['/student','/student/assignments/123','/student/stem-labs/respiratory','/teacher/sba','/school-admin/billing','/platform/cms/review/abc','/admin/cms/create']) {
    assert.equal(routeRequest({uri:path},routes).uri,'/app.html',path);
  }
  assert.equal(routeRequest({uri:'/school/DEMO-001/login'},routes).uri,'/login/index.html');
  assert.equal(routeRequest({uri:'/login/staff'},routes).uri,'/login/index.html');
  assert.equal(routeRequest({uri:'/register'},routes).uri,'/register/index.html');
});
test('unknown public or private routes are HTTP 404, never successful login responses', () => {
  for(const path of ['/missing','/revision/grade-10/biology/','/student/missing','/platform/not-a-real-screen','/login/unknown','/404.html','/../index.html']) {
    const result=routeRequest({uri:path},routes);
    assert.equal(result.statusCode,404,path);
    assert.equal(result.headers['x-robots-tag'].value,'noindex, nofollow');
  }
  assert.equal(routeRequest({uri:'/revision/grade-7/mathematics/'},routes).uri,'/revision/grade-7/mathematics/index.html');
  assert.equal(routeRequest({uri:'/assets/app-abc.js'},routes).uri,'/assets/app-abc.js');
  assert.equal(routeRequest({uri:'/assets/music-loops/sikuti_lead.wav'},routes).uri,'/assets/music-loops/sikuti_lead.wav');
});
test('generated CloudFront handler implements the same routes within AWS size limit', async () => {
  const root=await mkdtemp(join(tmpdir(),'seo-routing-'));
  try {
    await mkdir(join(root,'login'));
    await writeFile(join(root,'index.html'),'<h1>Home</h1>');
    await writeFile(join(root,'login/index.html'),appShell(template,'/login'));
    await writeFile(join(root,'404.html'),appShell(template,'/404',{notFound:true,body:'<h1>404</h1>'}));
    const generated=await generateRouting(root);
    const code=await readFile(join(root,'cloudfront-function.js'),'utf8');
    assert(Buffer.byteLength(code)<=10000);
    const context={}; vm.runInNewContext(code,context);
    for (const uri of ['/','/login','/school/DEMO-001/login','/student/assignments/8','/missing','/404.html']) {
      assert.equal(JSON.stringify(context.handler({request:{uri}})),JSON.stringify(routeRequest({uri},generated)));
    }
  } finally { await rm(root,{recursive:true,force:true}); }
});
test('sitemap publication forcibly replaces stale cache metadata', async () => {
  const publish=await readFile(new URL('../../scripts/deployment/publish-frontend.sh',import.meta.url),'utf8');
  assert.match(publish,/sitemap\.xml"[^\n]*max-age=86400[^\n]*--metadata-directive REPLACE/);
  assert.match(publish,/check-static-seo\.mjs/);
});
