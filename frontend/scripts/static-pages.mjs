import { loadTypeScript } from './load-typescript.mjs';
export const { routeMetadata } = await loadTypeScript(new URL('../src/utils/page-metadata.ts', import.meta.url));
const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

export function appShell(html, path, { notFound = false, body = '' } = {}) {
  const data = routeMetadata(path, notFound);
  const schema = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  // No homepage FAQ/product schema on account or error pages. A non-schema
  // template lets client-side navigation restore it only when opening Home.
  let shell = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(data.title)}</title>`)
    .replace(/<meta name="robots" content="[^"]*"\s*\/?>/, `<meta name="robots" content="${data.robots}" />`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${escape(data.description)}" />`)
    .replace(/<link rel="canonical"[^>]*>/g, data.canonical ? `<link rel="canonical" href="${data.canonical}" />` : '')
    .replace(/<meta (?:name|property)="(?:og:|twitter:)[^"]*"[^>]*>/g, '')
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  if (!notFound && schema) shell = shell.replace('</head>', `<script id="homepage-schema-template" type="application/json">${schema}</script></head>`);
  return shell;
}
