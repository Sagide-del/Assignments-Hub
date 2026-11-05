// S3 REST origins do not resolve directory indexes. Publish exact object keys for
// clean public URLs, with a separate snapshot so rollbacks restore those keys too.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
export function validateRoutes(value) {
  if (!Array.isArray(value) || value.length > 4000)
    throw Error("Invalid public route manifest");
  for (const r of value)
    if (
      !r ||
      typeof r.path !== "string" ||
      !/^\/(?:free-revision|revision(?:\/[a-z0-9-]+){0,2})\/$/.test(r.path) ||
      r.file !== r.path.slice(1) + "index.html"
    )
      throw Error("Unsafe public route");
  if (new Set(value.map((r) => r.path)).size !== value.length)
    throw Error("Duplicate public routes");
  return value;
}
export const aliases = (routes) =>
  routes.flatMap((r) => [
    { key: r.path.slice(1), file: r.file },
    { key: r.path.slice(1, -1), file: r.file },
  ]);
const aws = (args) =>
  execFileSync("aws", args, {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
function get(bucket, key, file) {
  try {
    aws(["s3api", "get-object", "--bucket", bucket, "--key", key, file]);
    return true;
  } catch (err) {
    if (/NoSuchKey|Not Found|\(404\)/.test(String(err.stderr))) return false;
    throw err;
  }
}
function put(bucket, key, file) {
  aws([
    "s3api",
    "put-object",
    "--bucket",
    bucket,
    "--key",
    key,
    "--body",
    file,
    "--content-type",
    "text/html; charset=utf-8",
    "--cache-control",
    "no-cache,max-age=0,must-revalidate",
  ]);
}
export async function run(mode, bucket, prefix, dist, snapshot) {
  prefix = prefix ? prefix.replace(/^\/+|\/+$/g, "") + "/" : "";
  const key = (relative) => prefix + relative;
  const manifestFile = "revision/route-aliases.json";
  const newRoutes = validateRoutes(
    JSON.parse(readFileSync(join(dist, manifestFile), "utf8")),
  );
  const stateFile = join(snapshot, "state.json");
  mkdirSync(snapshot, { recursive: true });
  // The deployment role deliberately has GetObject/PutObject, not DeleteObject.
  // Clear withdrawn content with an unlinked noindex document using that scope.
  const withdrawnFile = join(snapshot, "withdrawn.html");
  writeFileSync(
    withdrawnFile,
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,follow"><title>Revision page unavailable | Assignment Hub</title></head><body><main><h1>This revision page is no longer available</h1><a href="/free-revision/">Browse available free revision</a></main></body></html>',
  );
  const clear = (relative) => put(bucket, key(relative), withdrawnFile);
  if (mode === "prepare") {
    const previous = join(snapshot, "previous-routes.json");
    const oldRoutes = get(bucket, key(manifestFile), previous)
      ? validateRoutes(JSON.parse(readFileSync(previous, "utf8")))
      : [];
    const old = aliases(oldRoutes),
      next = aliases(newRoutes),
      saved = [];
    for (const item of old) {
      const file = join(
        snapshot,
        createHash("sha256").update(item.key).digest("hex"),
      );
      if (get(bucket, key(item.key), file)) saved.push({ ...item, file });
    }
    writeFileSync(stateFile, JSON.stringify({ old, next, saved }));
    writeFileSync(
      join(snapshot, "excludes.txt"),
      [...new Set([...old, ...next].map((r) => r.key))].join("\n") + "\n",
    );
  } else if (mode === "publish") {
    const state = JSON.parse(readFileSync(stateFile, "utf8"));
    for (const item of state.next)
      put(bucket, key(item.key), join(dist, item.file));
    for (const item of state.old)
      if (!state.next.some((r) => r.key === item.key)) {
        clear(item.key);
        clear(item.file);
      }
  } else if (mode === "restore") {
    if (!existsSync(stateFile)) return;
    const state = JSON.parse(readFileSync(stateFile, "utf8"));
    for (const item of state.saved) put(bucket, key(item.key), item.file);
    for (const item of state.next)
      if (!state.saved.some((r) => r.key === item.key)) clear(item.key);
  } else if (mode === "verify") {
    for (const route of newRoutes) {
      const expected = readFileSync(resolve(dist, route.file));
      for (const path of [route.path, route.path.slice(0, -1)]) {
        const response = await fetch("https://assignmenthub.co.ke" + path, {
          signal: AbortSignal.timeout(30000),
        });
        if (
          !response.ok ||
          !Buffer.from(await response.arrayBuffer()).equals(expected)
        )
          throw Error(
            `Clean public URL does not match its static document: ${path}`,
          );
      }
    }
    console.log(
      `Verified ${newRoutes.length} public documents at clean URLs, with and without trailing slashes.`,
    );
  } else throw Error("Unknown route operation");
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await run(...process.argv.slice(2));
