import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const library=JSON.parse(readFileSync(new URL('../public/assets/music-loops/loops.json',import.meta.url)));
test('twenty-four audio loops have audible, bounded PCM samples and correct one-bar durations',()=>{
 assert.equal(library.loops.length,24);assert.equal(new Set(library.loops.map(l=>l.id)).size,24);
 for(const loop of library.loops){
  const b=readFileSync(new URL(`../public${loop.file}`,import.meta.url));
  assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');
  assert.equal(b.readUInt16LE(22),1);assert.equal(b.readUInt16LE(34),16);
  const duration=b.readUInt32LE(40)/(b.readUInt32LE(24)*2),[num,den]=loop.time_signature.split('/').map(Number);
  assert.ok(Math.abs(duration-num*4/den*60/loop.bpm)<0.001);
  let max=0;for(let i=44;i<b.length;i+=2)max=Math.max(max,Math.abs(b.readInt16LE(i)));
  assert.ok(max>1000&&max<32767);assert.equal(loop.waveform.length,32);
  assert.match(loop.provenance,/synthesized|CC0 VSCO/);assert.ok(loop.context.length>60);
 }
});
test('Isukuti, Benga and Chakacha have cultural context and teaching provenance',()=>{
 for(const id of ['sikuti_lead','sikuti_response','benga_guitar','chakacha_percussion']){const l=library.loops.find(l=>l.id===id);assert.equal(l.category,'Kenyan Rhythms');assert.ok(l.origin);assert.match(l.provenance,/not a traditional recording/);}
});

test('reggae, dancehall and Kenyan folk-inspired packs have complementary parts accepted by the backend',()=>{const ids=JSON.parse(readFileSync(new URL('../../backend/src/student/music/loop-ids.json',import.meta.url)));assert.deepEqual(ids,library.loops.map(l=>l.id));for(const prefix of ['dancehall','reggae','folk','benga','coastal','rhumba']){const pack=library.loops.filter(l=>l.id.startsWith(prefix+'_')&&['drums','keys','bass'].some(p=>l.id===prefix+'_'+p));assert.equal(pack.length,3);assert.equal(new Set(pack.map(l=>l.bpm)).size,1);assert.equal(new Set(pack.map(l=>l.time_signature)).size,1);for(const l of pack)assert.match(l.provenance,/CC0/);}});
