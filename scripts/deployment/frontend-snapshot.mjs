// S3 keys are not filesystem paths: "blog", "blog/" and "blog/index.html"
// may all be independent objects. Preserve each under a hash, never its key.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const execute = promisify(execFile);
const digest = value => createHash('sha256').update(value).digest('hex');
const headers = {
  ContentType: '--content-type', CacheControl: '--cache-control',
  ContentDisposition: '--content-disposition', ContentEncoding: '--content-encoding',
  ContentLanguage: '--content-language', Expires: '--expires',
  WebsiteRedirectLocation: '--website-redirect-location',
};
async function aws(args) {
  const { stdout } = await execute('aws', [...args, '--output', 'json'], { maxBuffer: 16 * 1024 * 1024 });
  return stdout.trim() ? JSON.parse(stdout) : {};
}
async function parallel(items, action) {
  let cursor = 0;
  const results = await Promise.allSettled(Array.from({ length: Math.min(8, items.length) }, async () => {
    while (cursor < items.length) await action(items[cursor++]);
  }));
  const failure = results.find(result => result.status === 'rejected');
  if (failure) throw failure.reason;
}
export async function run(mode, bucket, rawPrefix, directory) {
  const prefix = rawPrefix ? rawPrefix.replace(/^\/+|\/+$/g, '') + '/' : '';
  const stateFile = join(directory, 'state.json');
  if (mode === 'prepare') {
    if (existsSync(stateFile)) throw Error('Recovery snapshot already exists; refusing to overwrite it.');
    await mkdir(join(directory, 'objects'), { recursive: true });
    const listed = await aws(['s3api', 'list-objects-v2', '--bucket', bucket, '--prefix', prefix]);
    const entries = (listed.Contents ?? []).map(object => {
      if (typeof object.Key !== 'string' || !object.Key.startsWith(prefix)) throw Error('Unexpected snapshot object key.');
      return { key: object.Key, file: 'objects/' + digest(object.Key) };
    });
    const home = entries.find(object => object.key === prefix + 'index.html');
    if (!home) throw Error('Production index.html is missing; stop before publishing.');
    await parallel(entries, async object => {
      const metadata = await aws(['s3api', 'get-object', '--bucket', bucket, '--key', object.key, join(directory, object.file)]);
      object.sha256 = digest(await readFile(join(directory, object.file)));
      object.headers = Object.fromEntries(Object.keys(headers).filter(key => metadata[key] !== undefined).map(key => [key, metadata[key]]));
      object.metadata = metadata.Metadata ?? {};
    });
    // Keep the public homepage comparison and recovery artifact easy to inspect.
    await copyFile(join(directory, home.file), join(directory, 'index.html'));
    await writeFile(stateFile, JSON.stringify({ version: 1, bucket, prefix, entries }, null, 2));
    console.log(`Snapshotted ${entries.length} S3 objects without filesystem key collisions.`);
  } else if (mode === 'restore') {
    const state = JSON.parse(await readFile(stateFile, 'utf8'));
    if (state.version !== 1 || state.bucket !== bucket || state.prefix !== prefix || !Array.isArray(state.entries)) throw Error('Snapshot target does not match the production origin.');
    // Validate the entire recovery set before writing anything back to S3.
    await parallel(state.entries, async object => {
      if (typeof object.key !== 'string' || !object.key.startsWith(prefix) || object.file !== 'objects/' + digest(object.key)) throw Error('Unsafe snapshot entry.');
      if (digest(await readFile(join(directory, object.file))) !== object.sha256) throw Error(`Snapshot integrity check failed: ${object.key}`);
    });
    await parallel(state.entries, async object => {
      const args = ['s3api', 'put-object', '--bucket', bucket, '--key', object.key, '--body', join(directory, object.file)];
      for (const [key, flag] of Object.entries(headers)) if (object.headers?.[key] !== undefined) args.push(flag, String(object.headers[key]));
      if (Object.keys(object.metadata ?? {}).length) args.push('--metadata', JSON.stringify(object.metadata));
      await aws(args);
    });
    console.log(`Restored ${state.entries.length} S3 objects with their original keys and metadata.`);
  } else throw Error('Unknown snapshot operation.');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await run(...process.argv.slice(2));
