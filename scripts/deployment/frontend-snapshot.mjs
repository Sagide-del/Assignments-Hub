// S3 keys are not filesystem paths: "blog", "blog/" and "blog/index.html"
// may all be independent objects. Preserve each under a hash, never its key.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { stat } from 'node:fs/promises';
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
export async function cliTransport(args) {
  const pending = execute('aws', [...args, '--output', 'json'], { maxBuffer: 16 * 1024 * 1024, env: { ...process.env, AWS_PAGER: '', AWS_CLI_AUTO_PROMPT: 'off' } });
  pending.child.stdin?.end();
  const { stdout } = await pending;
  return stdout.trim() ? JSON.parse(stdout) : {};
}
// Reuse one authenticated S3 client: a large bucket must not start thousands
// of AWS CLI/Python processes just to make its recovery copy.
export function sdkTransport(client, commands) {
  return async args => {
    const value = flag => args[args.indexOf(flag) + 1];
    const Bucket = value('--bucket');
    if (args[1] === 'list-objects-v2') {
      const Contents = [];
      let ContinuationToken;
      do {
        const page = await client.send(new commands.ListObjectsV2Command({ Bucket, Prefix: value('--prefix'), ...(ContinuationToken ? { ContinuationToken } : {}) }));
        Contents.push(...(page.Contents ?? []));
        if (page.IsTruncated && !page.NextContinuationToken) throw Error('Incomplete S3 listing; stop before publishing.');
        ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (ContinuationToken);
      return { Contents };
    }
    const Key = value('--key');
    if (args[1] === 'get-object') {
      const response = await client.send(new commands.GetObjectCommand({ Bucket, Key }));
      if (!response.Body) throw Error('S3 returned no object body.');
      await pipeline(response.Body, createWriteStream(args[args.indexOf('--key') + 2]));
      return response;
    }
    if (args[1] === 'put-object') {
      const file = value('--body');
      const input = { Bucket, Key, ContentLength: (await stat(file)).size };
      for (const [key, flag] of Object.entries(headers)) if (args.includes(flag)) input[key] = key === 'Expires' ? new Date(value(flag)) : value(flag);
      if (args.includes('--metadata')) input.Metadata = JSON.parse(value('--metadata'));
      const Body = createReadStream(file);
      try { return await client.send(new commands.PutObjectCommand({ ...input, Body })); }
      finally { Body.destroy(); }
    }
    throw Error('Unsupported snapshot operation.');
  };
}
let productionTransport;
let productionClient;
async function aws(args) {
  if (!productionTransport) {
    const require = createRequire(new URL('../../backend/package.json', import.meta.url));
    let sdk;
    try { sdk = require('@aws-sdk/client-s3'); }
    catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') throw error;
      // Allows manual recovery with only the AWS CLI installed. CI already
      // installs the backend's existing SDK dependency before publication.
      productionTransport = cliTransport;
    }
    if (sdk) {
      productionClient = new sdk.S3Client({ region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'eu-west-2' });
      productionTransport = sdkTransport(productionClient, sdk);
    }
  }
  return productionTransport(args);
}
async function parallel(items, action) {
  let cursor = 0;
  const results = await Promise.allSettled(Array.from({ length: Math.min(8, items.length) }, async () => {
    while (cursor < items.length) await action(items[cursor++]);
  }));
  const failure = results.find(result => result.status === 'rejected');
  if (failure) throw failure.reason;
}
export async function run(mode, bucket, rawPrefix, directory, request = aws) {
  const awsRequest = request;
  const prefix = rawPrefix ? rawPrefix.replace(/^\/+|\/+$/g, '') + '/' : '';
  const stateFile = join(directory, 'state.json');
  if (mode === 'prepare') {
    if (existsSync(stateFile)) throw Error('Recovery snapshot already exists; refusing to overwrite it.');
    await mkdir(join(directory, 'objects'), { recursive: true });
    const listed = await awsRequest(['s3api', 'list-objects-v2', '--bucket', bucket, '--prefix', prefix]);
    const entries = (listed.Contents ?? []).map(object => {
      if (typeof object.Key !== 'string' || !object.Key.startsWith(prefix)) throw Error('Unexpected snapshot object key.');
      return { key: object.Key, file: 'objects/' + digest(object.Key) };
    });
    const home = entries.find(object => object.key === prefix + 'index.html');
    if (!home) throw Error('Production index.html is missing; stop before publishing.');
    console.log(`Preparing recovery snapshot for ${entries.length} S3 objects.`);
    let completed = 0;
    await parallel(entries, async object => {
      const metadata = await awsRequest(['s3api', 'get-object', '--bucket', bucket, '--key', object.key, join(directory, object.file)]);
      object.sha256 = digest(await readFile(join(directory, object.file)));
      object.headers = Object.fromEntries(Object.keys(headers).filter(key => metadata[key] !== undefined).map(key => [key, metadata[key]]));
      object.metadata = metadata.Metadata ?? {};
      completed++;
      if (completed % 100 === 0) console.log(`Snapshot progress: ${completed}/${entries.length} objects.`);
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
      await awsRequest(args);
    });
    console.log(`Restored ${state.entries.length} S3 objects with their original keys and metadata.`);
  } else throw Error('Unknown snapshot operation.');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await run(...process.argv.slice(2)); }
  finally { productionClient?.destroy(); }
}
