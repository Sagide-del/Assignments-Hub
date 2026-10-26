import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import ts from 'typescript';
const cache = new Map();
function moduleUrl(file) {
  if (cache.has(file)) return cache.get(file);
  const source = readFileSync(file, 'utf8');
  let { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
  outputText = outputText.replace(/from\s+(['"])(\.\.?\/[^'"]+)\1/g, (_, quote, relative) => {
    const base = resolve(dirname(file), relative);
    const child = [base + '.ts', resolve(base, 'index.ts')].find(existsSync);
    if (!child) throw new Error(`Cannot resolve test import ${relative}`);
    return `from ${quote}${moduleUrl(child)}${quote}`;
  });
  const url = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
  cache.set(file, url);
  return url;
}
export function loadTypeScript(url) { return import(moduleUrl(fileURLToPath(url instanceof URL ? url : pathToFileURL(url)))); }
