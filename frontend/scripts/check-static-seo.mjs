import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export function checkHome(html) {
  assert.match(html, /data-prerendered="homepage"/, 'Homepage must be statically rendered');
  assert.match(html, /<h1\b[^>]*>[\s\S]*?Understand more. Revise with confidence.[\s\S]*?<\/h1>/, 'Homepage H1 is missing');
  assert.match(html, /Topic practice, clear feedback/, 'Homepage subtitle is missing');
  assert.match(html, /<img\b[^>]*src="\/product-previews\/respiratory.webp"/, 'Lung image is missing');
  assert.match(html, /id="problem-heading"/);
  assert.match(html, /id="workflow-heading"/);
}
export function checkAccount(html, title) {
  assert.match(html, new RegExp(`<title>${title} \\| Assignment Hub Kenya<\\/title>`));
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  assert.doesNotMatch(html, /type="application\/ld\+json"/);
  assert.doesNotMatch(html, /data-prerendered="homepage"/);
}
export async function checkStatic(dist) {
  const read = path => readFile(resolve(dist, path), 'utf8');
  checkHome(await read('index.html'));
  checkAccount(await read('login/index.html'), 'Login');
  checkAccount(await read('register/index.html'), 'Create Account');
  const error = await read('404.html');
  assert.match(error, /404 · Page not found/);
  assert.match(error, /<h1/);
  assert.match(error, /name="robots" content="noindex, nofollow"/);
  assert.doesNotMatch(await read('app.html'), /data-prerendered="homepage"/);
  const routes = JSON.parse(await read('routing-manifest.json'));
  assert.equal(routes.pages['/'], '/index.html');
  assert.equal(routes.pages['/login'], '/login/index.html');
  console.log('PASS: built homepage HTML, lungs, account metadata, 404 and route manifest.');
}
export async function checkLive(origin) {
  const get = path => fetch(new URL(path, origin), { signal: AbortSignal.timeout(30000) });
  const home = await get('/'); assert.equal(home.status, 200); checkHome(await home.text());
  for (const [path, title] of [['/login','Login'],['/login?account=independent','Login'],['/login/staff','Login'],['/school/DEMO-001/login','Login'],['/register','Create Account']]) {
    const response = await get(path); assert.equal(response.status, 200, path); checkAccount(await response.text(), title);
  }
  for (const path of ['/audit-missing-page-7d64f4','/revision/audit-missing-topic-7d64f4/']) {
    const response = await get(path); assert.equal(response.status, 404, `Missing page must return HTTP 404: ${path}`);
    assert.match(await response.text(), /404 · Page not found/);
  }
  const sitemap = await get('/sitemap.xml'); assert.equal(sitemap.status, 200);
  assert.match(sitemap.headers.get('cache-control') ?? '', /(?:^|[,\s])max-age=86400(?:$|[,\s])/);
  assert.doesNotMatch(sitemap.headers.get('cache-control') ?? '', /immutable/);
  console.log('PASS: live no-JS homepage, account metadata, real public HTTP 404 and one-day sitemap cache.');
}
if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  if (process.argv[2] === '--live') await checkLive(process.argv[3]);
  else await checkStatic(process.argv[2] ?? 'dist');
}
