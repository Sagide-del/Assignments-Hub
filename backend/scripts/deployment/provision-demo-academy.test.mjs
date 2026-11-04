import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

test('Render backend-only checkout provisions without parent repository files or seeding', () => {
  const root = mkdtempSync(join(tmpdir(), 'render-backend-only-'));
  try {
    const backend = join(root, 'backend'), scripts = join(backend, 'scripts/deployment'), bin = join(root, 'bin');
    for (const path of [scripts, bin, join(backend, 'prisma'), join(backend, 'dist/src/scripts/operations')]) mkdirSync(path, { recursive: true });
    for (const file of ['provision-demo-academy.sh', 'verify-rbac-live.mjs']) copyFileSync(join(dirname(fileURLToPath(import.meta.url)), file), join(scripts, file));
    writeFileSync(join(backend, 'prisma/schema.prisma'), '// isolated fixture');
    writeFileSync(join(backend, 'dist/src/scripts/operations/demo-academy.js'), '// isolated fixture');
    writeFileSync(join(bin, 'npx'), `#!/usr/bin/env python3
import sys,os
assert sys.argv[1:]==['--no-install','prisma','migrate','deploy']
with open(os.environ['RENDER_FIXTURE_CALLS'],'a') as f:f.write('migrate deploy\\n')
`, { mode: 0o755 });
    writeFileSync(join(bin, 'node'), `#!/usr/bin/env python3
import sys,os,json
from pathlib import Path
a=sys.argv[1:]
if a[0]=='-e':
 report=json.loads(Path(a[-1]).read_text());print(report['students']['AW002'],end='')
elif a[0].endswith('demo-academy.js'):
 assert Path(a[0]).exists()
 if '--apply' in a: print(json.dumps({'students':{'AW002':42}}))
elif a[0].endswith('verify-rbac-live.mjs'):
 assert Path(a[0]).exists()
 assert os.environ['RBAC_ALICE_ID']=='42'
 with open(os.environ['RENDER_FIXTURE_CALLS'],'a') as f:f.write('verified backend-only API helper\\n')
else: sys.exit(9)
`, { mode: 0o755 });
    const result = spawnSync('bash', [join(scripts, 'provision-demo-academy.sh')], { cwd: backend, env: { ...process.env, PATH: bin + ':' + process.env.PATH, DATABASE_URL: 'postgresql://fixture.invalid/no-network', DEMO_TEACHER_PASSWORD: 'local-fixture-password', RENDER_FIXTURE_CALLS: join(root, 'calls') }, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(join(root, 'calls'), 'utf8'), 'migrate deploy\nverified backend-only API helper\n');
    assert(result.stdout.includes('RBAC_DEMO_ALICE_ID=42'));
    assert(!result.stdout.includes('local-fixture-password'));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
