import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const base=new URL('../public/stem/anatomy/sports/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',base)));
test('sports and thorax assets contain attributed atlas bones rather than placeholder geometry',()=>{assert.equal(manifest.license,'CC-BY-SA-4.0');for(const a of manifest.assets){const bytes=readFileSync(new URL(a.file,base));assert.equal(bytes.length,a.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),a.sha256);assert.equal(bytes.readUInt32LE(0),0x46546c67);const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));assert.match(doc.asset.copyright,/Z-Anatomy/);assert.ok(doc.meshes.length>=20);if(a.file.startsWith('skeleton')){assert.ok(doc.nodes.some(n=>n.extras?.bone_key==='femur'));assert.ok(doc.nodes.some(n=>n.extras?.bone_key==='ribs'));assert.ok(doc.nodes.some(n=>n.extras?.bone_key==='skull'));}}assert.ok(manifest.bones.length>=100);assert.match(readFileSync(new URL('ATTRIBUTION.txt',base),'utf8'),/ShareAlike/);});

test('upper-arm explorer ships attributed anatomical muscle geometry with reproducible provenance',()=>{
 const provenance=JSON.parse(readFileSync(new URL('arm-muscles-manifest.json',base)));
 const bytes=readFileSync(new URL(provenance.file,base));
 assert.equal(bytes.length,provenance.bytes);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),provenance.sha256);
 const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
 assert.equal(provenance.license,'CC-BY-SA-4.0');
 assert.match(doc.asset.copyright,/Z-Anatomy/);
 for(const structure of ['biceps','triceps','brachialis','bone']) assert.ok(doc.nodes.some(n=>n.extras?.structure===structure),structure);
 assert.ok(doc.meshes.length>=10);
 assert.ok(bytes.length<1500000,'keep the mobile anatomy asset bounded');
});
