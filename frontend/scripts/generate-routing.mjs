import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import ts from 'typescript';

export function spaRoutes(source) {
  const file = ts.createSourceFile('routes.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const paths = [];
  function visit(node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(file) === 'path' && ts.isStringLiteral(node.initializer)) {
      const path = node.initializer.text;
      if (path.startsWith('/') && !['/', '/free-revision'].includes(path)) paths.push(path);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return [...new Set(paths)].map(path => ({
    pattern: '^' + path.split('/').map(part => part === '*' ? '.*' : part.startsWith(':') ? '[^/]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('/') + '/?$',
    target: path === '/register' ? '/register/index.html' : path.startsWith('/login') || path === '/platform-console' || path === '/school/:schoolCode/login' ? '/login/index.html' : '/app.html',
  }));
}

// This exact function runs at CloudFront and in the local preview/tests.
export function routeRequest(request, routes) {
  var path = request.uri;
  if (path === '/404.html' || path.indexOf('..') !== -1) return {
    statusCode: 404, statusDescription: 'Not Found',
    headers: { 'content-type': { value: 'text/html; charset=utf-8' }, 'cache-control': { value: 'no-store' }, 'x-robots-tag': { value: 'noindex, nofollow' } },
    body: { encoding: 'text', data: routes.notFound },
  };
  var page = path.replace(/\/index\.html$/, '/').replace(/\/+$/, '') || '/';
  if (Object.prototype.hasOwnProperty.call(routes.pages, page)) {
    request.uri = routes.pages[page];
    return request;
  }
  for (var i = 0; i < routes.spa.length; i++) {
    if (new RegExp(routes.spa[i].pattern).test(path)) {
      request.uri = routes.spa[i].target;
      return request;
    }
  }
  if (/\.(?:css|js|mjs|map|json|xml|txt|webmanifest|png|jpe?g|webp|avif|svg|ico|gif|woff2?|ttf|wasm|mp3|mp4|pdf|glb|gltf|bin)$/i.test(path)) return request;
  return {
    statusCode: 404, statusDescription: 'Not Found',
    headers: { 'content-type': { value: 'text/html; charset=utf-8' }, 'cache-control': { value: 'no-store' }, 'x-robots-tag': { value: 'noindex, nofollow' } },
    body: { encoding: 'text', data: routes.notFound },
  };
}

export async function generateRouting(dist = fileURLToPath(new URL('../dist/', import.meta.url))) {
  const pages = {};
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.name === 'index.html') {
        const key = '/' + relative(dist, path).split('\\').join('/');
        const base = key.slice(0, -'index.html'.length);
        pages[base === '/' ? '/' : base.slice(0, -1)] = key;
      }
    }
  }
  await walk(dist);
  const patterns = spaRoutes(await readFile(new URL('../src/app/router/index.tsx', import.meta.url), 'utf8'));
  const targets = [...new Set(patterns.map(r => r.target))];
  const routes = {
    version: 1,
    pages,
    spa: targets.map(target => ({ target, pattern: '^(?:' + patterns.filter(r => r.target === target).map(r => r.pattern.slice(1, -1)).join('|') + ')$' })),
    notFound: await readFile(join(dist, '404.html'), 'utf8'),
  };
  // The 404 needs no app bundle or hidden homepage-schema template at the edge.
  routes.notFound = routes.notFound.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/\s{2,}/g, ' ');
  const code = `var routes=${JSON.stringify(routes)};\n${routeRequest.toString()}\nfunction handler(event){return routeRequest(event.request,routes);}`;
  if (Buffer.byteLength(code) > 10000) throw Error('CloudFront routing exceeds its 10 KB limit; split the public route manifest before publishing.');
  await writeFile(join(dist, 'routing-manifest.json'), JSON.stringify(routes, null, 2));
  await writeFile(join(dist, 'cloudfront-function.js'), code);
  console.log(`Generated edge routing: ${Object.keys(pages).length} public aliases and ${routes.spa.length} app routes (${Buffer.byteLength(code)} bytes).`);
  return routes;
}
