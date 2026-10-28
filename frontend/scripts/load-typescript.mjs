import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import ts from "typescript";
const cache = new Map();
function moduleUrl(file) {
  if (cache.has(file)) return cache.get(file);
  const source = readFileSync(file, "utf8");
  if (file.endsWith(".json")) {
    const url = `data:text/javascript;base64,${Buffer.from("export default " + source).toString("base64")}`;
    cache.set(file, url);
    return url;
  }
  let { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
  });
  outputText = outputText.replace(
    /from\s+(['"])(\.\.?\/[^'"]+)\1/g,
    (_, quote, relative) => {
      const base = resolve(dirname(file), relative);
      const child = [base, base + ".ts", resolve(base, "index.ts")].find(
        (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
      );
      if (!child) throw new Error(`Cannot resolve test import ${relative}`);
      return `from ${quote}${moduleUrl(child)}${quote}`;
    },
  );
  const url = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
  cache.set(file, url);
  return url;
}
export function loadTypeScript(url) {
  return import(
    moduleUrl(fileURLToPath(url instanceof URL ? url : pathToFileURL(url)))
  );
}
