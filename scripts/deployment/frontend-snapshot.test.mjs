import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { run as snapshotRun, cliTransport, sdkTransport } from './frontend-snapshot.mjs';
import { Readable } from 'node:stream';
const run = (...args) => snapshotRun(...args, cliTransport);

const hash = key => createHash('sha256').update(key).digest('hex');
async function fixture(action) {
  const root = await mkdtemp(join(tmpdir(), 's3-flat-snapshot-'));
  const bin = join(root, 'bin'), store = join(root, 'store'), snapshot = join(root, 'snapshot');
  await mkdir(bin); await mkdir(store);
  const previous = { path: process.env.PATH, store: process.env.SNAPSHOT_TEST_STORE };
  const object = key => join(store, hash(key));
  const metadata = { ContentType: 'text/html; charset=utf-8', CacheControl: 'public,max-age=86400', Metadata: { release: 'previous' } };
  const keys = ['index.html', 'about', 'about/', 'about/index.html', 'blog', 'blog/', 'blog/index.html', 'blog/csl-ideas-for-students', 'blog/csl-ideas-for-students/', 'blog/csl-ideas-for-students/index.html'];
  const originals = new Map();
  for (const key of keys) {
    const body = key === 'about/' ? Buffer.alloc(0) : Buffer.from(`original ${key}`);
    originals.set(key, body);
    await writeFile(object(key), body);
    await writeFile(object(key) + '.json', JSON.stringify(metadata));
  }
  await writeFile(join(store, 'keys.json'), JSON.stringify(keys));
  await writeFile(join(bin, 'aws'), `#!/usr/bin/env python3
import os,sys,json,hashlib
from pathlib import Path
a=sys.argv[1:];store=Path(os.environ['SNAPSHOT_TEST_STORE'])
operation=a[1]
if operation=='list-objects-v2':
 prefix=a[a.index('--prefix')+1]
 print(json.dumps({'Contents':[{'Key':k} for k in json.loads((store/'keys.json').read_text()) if k.startswith(prefix)]}))
else:
 key=a[a.index('--key')+1];file=store/hashlib.sha256(key.encode()).hexdigest()
 if operation=='get-object':
  if (store/'fail-get').exists():print('fixture download failure',file=sys.stderr);sys.exit(1)
  destination=Path(a[a.index('--key')+2]);destination.write_bytes(file.read_bytes());print(file.with_suffix('.json').read_text())
 elif operation=='put-object':
  file.write_bytes(Path(a[a.index('--body')+1]).read_bytes())
  flags={'--content-type':'ContentType','--cache-control':'CacheControl','--content-disposition':'ContentDisposition','--content-encoding':'ContentEncoding','--content-language':'ContentLanguage','--expires':'Expires','--website-redirect-location':'WebsiteRedirectLocation'}
  meta={name:a[a.index(flag)+1] for flag,name in flags.items() if flag in a}
  if '--metadata' in a:meta['Metadata']=json.loads(a[a.index('--metadata')+1])
  file.with_suffix('.json').write_text(json.dumps(meta))
  with (store/'puts').open('a') as out:out.write(key+'\\n')
  print('{}')
 else:sys.exit(2)
`, { mode: 0o755 });
  process.env.PATH = bin + ':' + previous.path;
  process.env.SNAPSHOT_TEST_STORE = store;
  try { await action({ root, store, snapshot, object, metadata, keys, originals }); }
  finally {
    process.env.PATH = previous.path;
    if (previous.store === undefined) delete process.env.SNAPSHOT_TEST_STORE; else process.env.SNAPSHOT_TEST_STORE = previous.store;
    await rm(root, { recursive: true, force: true });
  }
}

test('snapshot and rollback preserve conflicting S3 objects, slash markers and original cache metadata', async () => {
  await fixture(async ({ snapshot, object, metadata, keys, originals }) => {
    await run('prepare', 'fixture-bucket', '', snapshot);
    assert.deepEqual(await readFile(join(snapshot, 'index.html')), originals.get('index.html'));
    const state = JSON.parse(await readFile(join(snapshot, 'state.json'), 'utf8'));
    assert.equal(state.entries.length, keys.length);
    assert.equal(new Set(state.entries.map(x => x.file)).size, keys.length);
    assert(state.entries.every(x => /^objects\/[a-f0-9]{64}$/.test(x.file)));
    for (const key of keys) { await writeFile(object(key), 'new release'); await writeFile(object(key)+'.json', '{}'); }
    await run('restore', 'fixture-bucket', '', snapshot);
    for (const key of keys) {
      assert.deepEqual(await readFile(object(key)), originals.get(key), key);
      assert.deepEqual(JSON.parse(await readFile(object(key)+'.json','utf8')), metadata, key);
    }
  });
});

test('corrupt recovery data or a different target is rejected before any S3 writes', async () => {
  await fixture(async ({ snapshot, store }) => {
    await run('prepare', 'fixture-bucket', '', snapshot);
    await assert.rejects(run('restore', 'wrong-bucket', '', snapshot), /target does not match/);
    const state=JSON.parse(await readFile(join(snapshot,'state.json'),'utf8'));
    await writeFile(join(snapshot,state.entries[0].file),'corrupt');
    await assert.rejects(run('restore','fixture-bucket','',snapshot),/integrity check failed/);
    await assert.rejects(readFile(join(store,'puts')), {code:'ENOENT'});
  });
});

test('a failed object download never creates a completed rollback manifest', async () => {
  await fixture(async ({ snapshot,store }) => {
    await writeFile(join(store,'fail-get'),'yes');
    await assert.rejects(run('prepare','fixture-bucket','',snapshot),/fixture download failure/);
    await assert.rejects(readFile(join(snapshot,'state.json')), {code:'ENOENT'});
    await assert.rejects(readFile(join(store,'puts')), {code:'ENOENT'});
  });
});


test('origin prefixes stay isolated and an existing recovery snapshot cannot be overwritten', async () => {
  await fixture(async ({ snapshot, store, object, metadata }) => {
    const keys=['index.html','frontend/index.html','frontend/blog','frontend/blog/','frontend/blog/index.html'];
    await writeFile(join(store,'keys.json'),JSON.stringify(keys));
    for (const key of keys.slice(1)) {
      await writeFile(object(key),`original ${key}`);
      await writeFile(object(key)+'.json',JSON.stringify(metadata));
    }
    await run('prepare','fixture-bucket','/frontend/',snapshot);
    await assert.rejects(run('prepare','fixture-bucket','/frontend/',snapshot),/already exists/);
    const state=JSON.parse(await readFile(join(snapshot,'state.json'),'utf8'));
    assert.equal(state.entries.length,4);
    assert(state.entries.every(x=>x.key.startsWith('frontend/')));
    await writeFile(object('index.html'),'outside prefix unchanged');
    await writeFile(object('frontend/blog'),'new release');
    await run('restore','fixture-bucket','frontend',snapshot);
    assert.equal(await readFile(object('frontend/blog'),'utf8'),'original frontend/blog');
    assert.equal(await readFile(object('index.html'),'utf8'),'outside prefix unchanged');
  });
});


test('reused S3 transport paginates, streams object bytes and restores metadata without spawning commands', async () => {
  const root=await mkdtemp(join(tmpdir(),'snapshot-sdk-'));
  const commands={
    ListObjectsV2Command: class {constructor(input){this.operation='list';this.input=input;}},
    GetObjectCommand: class {constructor(input){this.operation='get';this.input=input;}},
    PutObjectCommand: class {constructor(input){this.operation='put';this.input=input;}},
  };
  const objects=new Map([['index.html',Buffer.from('home')],['blog',Buffer.from('alias')],['blog/',Buffer.alloc(0)],['blog/index.html',Buffer.from('page')]]);
  const metadata={ContentType:'text/html',CacheControl:'public,max-age=86400',Expires:new Date('2027-01-01T00:00:00Z'),Metadata:{build:'old'}};
  const writes=[];let listings=0;
  const client={send:async command=>{
    const input=command.input;
    if(command.operation==='list'){
      listings++;
      const keys=[...objects.keys()];
      return input.ContinuationToken ? {Contents:keys.slice(2).map(Key=>({Key})),IsTruncated:false} : {Contents:keys.slice(0,2).map(Key=>({Key})),IsTruncated:true,NextContinuationToken:'next'};
    }
    if(command.operation==='get')return {...metadata,Body:Readable.from([objects.get(input.Key)])};
    const chunks=[];for await(const chunk of input.Body)chunks.push(chunk);
    const body=Buffer.concat(chunks);assert.equal(input.ContentLength,body.length);
    objects.set(input.Key,body);writes.push(input);return {};
  }};
  const request=sdkTransport(client,commands);
  try{
    await snapshotRun('prepare','fixture','',root,request);
    assert.equal(listings,2);
    for(const key of objects.keys())objects.set(key,Buffer.from('changed'));
    await snapshotRun('restore','fixture','',root,request);
    assert.equal(objects.get('blog').toString(),'alias');
    assert.equal(objects.get('blog/').length,0);
    assert.equal(objects.get('blog/index.html').toString(),'page');
    assert.equal(writes.length,4);
    for(const item of writes){assert.equal(item.CacheControl,metadata.CacheControl);assert.deepEqual(item.Metadata,metadata.Metadata);assert.equal(item.Expires.toISOString(),metadata.Expires.toISOString());}
  }finally{await rm(root,{recursive:true,force:true});}
});
