import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const source = dirname(fileURLToPath(import.meta.url));
function simulate(mode) {
  const root = mkdtempSync(join(tmpdir(), 'rbac-publish-fixture-'));
  const bin = join(root, 'bin'), scripts = join(root, 'scripts'), bucket = join(root, 'bucket');
  for (const p of [bin, scripts, bucket]) mkdirSync(p);
  writeFileSync(join(bucket,'index.html'), 'old frontend\n');
  writeFileSync(join(bucket,'shared.txt'), 'old shared\n');
  for (const f of ['publish-verified-rbac.sh','frontend-origin.py']) copyFileSync(join(source,f), join(scripts,f));
  writeFileSync(join(scripts,'frontend-edge.py'), `import os,sys
with open(os.environ['FAKE_CALLS'],'a') as f:f.write('edge-'+sys.argv[1]+'\\n')
if sys.argv[1]=='prepare' and os.environ['FAKE_MODE']=='edge-pre-fail':sys.exit(9)
`);
  writeFileSync(join(scripts,'publish-frontend.sh'), '#!/usr/bin/env bash\nset -e\nprintf "new frontend\\n" > "$FAKE_BUCKET/index.html"\nprintf "new shared\\n" > "$FAKE_BUCKET/shared.txt"\n');
  writeFileSync(join(bin,'aws'), `#!/usr/bin/env python3
import os,sys,json,shutil
from pathlib import Path
a=sys.argv[1:]
with open(os.environ['FAKE_CALLS'],'a') as f:f.write('aws '+str(a[:2])+'\\n')
if a[:2]==['cloudfront','get-distribution-config']:
 print(json.dumps({'DefaultCacheBehavior':{'TargetOriginId':'fixture'},'Origins':{'Items':[{'Id':'fixture','DomainName':'fixture-bucket.s3.eu-west-2.amazonaws.com','OriginPath':''}]}}))
elif a[:2]==['s3','sync']:
 src,dst=a[2:4]
 if src.startswith('s3://'):src=os.environ['FAKE_BUCKET']
 else:
  if os.environ['FAKE_MODE']=='rollback-fail':sys.exit(9)
  dst=os.environ['FAKE_BUCKET']
 shutil.copytree(src,dst,dirs_exist_ok=True)
elif a[:2]==['cloudfront','create-invalidation']:print('fixture-invalidation')
elif a[:2]!=['cloudfront','wait']:sys.exit(8)
`, { mode: 0o755 });
  writeFileSync(join(bin,'curl'), `#!/usr/bin/env python3
import os,sys
from pathlib import Path
a=sys.argv[1:];out=a[a.index('-o')+1]
value=Path(os.environ['FAKE_BUCKET'],'index.html').read_bytes()
if os.environ['FAKE_MODE']=='snapshot-mismatch':value=b'different cached frontend'
Path(out).write_bytes(value)
`, { mode: 0o755 });
  writeFileSync(join(bin,'node'), `#!/usr/bin/env python3
import os,sys
from pathlib import Path
if sys.argv[1]=='-e':sys.exit(0)
name=Path(sys.argv[1]).name
with open(os.environ['FAKE_CALLS'],'a') as f:f.write(name+'\\n')
if name=='verify-rbac-live.mjs':
 p=Path(os.environ['FAKE_COUNT']);n=int(p.read_text())+1 if p.exists() else 1;p.write_text(str(n))
 if (n==1 and os.environ['FAKE_MODE']=='pre-fail') or (n==2 and os.environ['FAKE_MODE'] in ['post-fail','rollback-fail']):sys.exit(5)
if name=='verify-rbac-browser.cjs' and os.environ['FAKE_MODE']=='browser-fail':sys.exit(6)
if name=='check-firstaid-assets.mjs' and os.environ['FAKE_MODE']=='asset-fail':sys.exit(7)
`, { mode: 0o755 });
  const result = spawnSync('bash', [join(scripts,'publish-verified-rbac.sh')], { env: { ...process.env, PATH: bin+':'+process.env.PATH, FRONTEND_DIST: root, DEMO_TEACHER_PASSWORD: 'non-secret-test-fixture', RBAC_ALICE_ID: '2', FAKE_MODE: mode, FAKE_BUCKET: bucket, FAKE_CALLS: join(root,'calls'), FAKE_COUNT: join(root,'count') }, encoding: 'utf8' });
  const output = { status: result.status, stderr: result.stderr, index: readFileSync(join(bucket,'index.html'),'utf8'), shared: readFileSync(join(bucket,'shared.txt'),'utf8'), calls: readFileSync(join(root,'calls'),'utf8') };
  // Failure simulation retains only fixture paths; erase any preserved recovery
  // snapshot printed by the wrapper, never real deployment snapshots.
  const snapshot = result.stderr.match(/snapshot: (\/tmp\/tmp\.[^\s]+)\/previous\//)?.[1];
  if (snapshot) rmSync(snapshot,{recursive:true,force:true});
  rmSync(root,{recursive:true,force:true});return output;
}
test('publishes after both API and browser verification succeed',()=>{const r=simulate('success');assert.equal(r.status,0,r.stderr);assert.equal(r.index,'new frontend\n');assert(r.calls.includes('verify-rbac-browser.cjs'));});
for (const mode of ['post-fail','browser-fail','asset-fail']) test(`restores previous HTML and shared files after ${mode}`,()=>{const r=simulate(mode);assert.equal(r.status,1);assert.equal(r.index,'old frontend\n');assert.equal(r.shared,'old shared\n');assert(r.stderr.includes('Verified: previous frontend restored.'));});
test('does not write or contact AWS if initial RBAC verification fails',()=>{const r=simulate('pre-fail');assert.notEqual(r.status,0);assert.equal(r.index,'old frontend\n');assert(!r.calls.includes('aws '));});
test('stops before publish if public HTML differs from the rollback snapshot',()=>{const r=simulate('snapshot-mismatch');assert.notEqual(r.status,0);assert.equal(r.index,'old frontend\n');assert(r.stderr.includes('Stop before deployment.'));});
test('reports an unverified rollback instead of claiming restoration',()=>{const r=simulate('rollback-fail');assert.equal(r.status,1);assert(r.stderr.includes('ROLLBACK NOT VERIFIED'));assert(!r.stderr.includes('Verified: previous frontend restored.'));});

test('edge permission/configuration failure stops before uploading frontend',()=>{const r=simulate('edge-pre-fail');assert.notEqual(r.status,0);assert.equal(r.index,'old frontend\n');assert(!r.calls.includes('verify-rbac-browser.cjs'));});
