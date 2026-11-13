import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../public',import.meta.url),read=url=>readFileSync(new URL('.'+url,root+'/'));
const samples=JSON.parse(read('/assets/music/recorded/samples.json')),arrangement=JSON.parse(read('/assets/music/recorded/play-along.json'));
test('recorded instruments and aligned backing stems have pinned CC0 provenance and intact audio',()=>{assert.equal(samples.license,'CC0-1.0');assert.equal(samples.authentic_isukuti,false);assert.match(read('/assets/music/recorded/LICENSE-CC0.txt').toString(),/CC0/);assert.equal(arrangement.stems.length,5);assert.equal(arrangement.musical_duration,4*4*60/arrangement.bpm);for(const asset of [...samples.samples,...arrangement.stems]){const bytes=read(asset.url);assert.equal(bytes.length,asset.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);assert.ok(bytes.length>1000);if(asset.source_url)assert.ok(asset.source_url.includes(samples.source_revision));if(asset.waveform){assert.equal(asset.waveform.length,128);assert.ok(asset.waveform.some(n=>n>0.01));}}});

const library=JSON.parse(read('/assets/music/recorded/arrangements.json'));
const registry=JSON.parse(readFileSync(new URL('../../backend/src/student/music-production/arrangements.json',import.meta.url)));
const songs=JSON.parse(read('/assets/music/songs/songs.json')).songs;
test('at least ten distinct playable pieces have complete aligned stems, matching persisted song and tempo metadata',()=>{
 assert.equal(library.arrangements.length,12);assert.equal(new Set(library.arrangements.map(a=>a.id)).size,12);
 const melodyHashes=new Set();
 for(const a of library.arrangements){const song=songs.find(s=>s.slug===a.song_slug);assert.ok(song&&song.content_kind!=='LISTENING_REFERENCE');assert.equal(a.bpm,song.bpm);assert.equal(a.time_signature,song.time_signature);assert.deepEqual(registry.find(r=>r.id===a.id),Object.fromEntries(['id','song_slug','bpm','time_signature','bars'].map(k=>[k,a[k]])));assert.equal(a.stems.length,5);const beats=a.time_signature==='6/8'?3:4;assert.ok(Math.abs(a.musical_duration-a.bars*beats*60/a.bpm)<1e-8);for(const stem of a.stems){const b=read(stem.url);assert.equal(createHash('sha256').update(b).digest('hex'),stem.sha256);assert.equal(b.length,stem.bytes);assert.equal(stem.waveform.length,128);assert.ok(stem.waveform.some(n=>n>.01));}melodyHashes.add(a.stems.find(s=>s.id==='melody').sha256);}
 assert.equal(melodyHashes.size,12);assert.ok(library.arrangements.some(a=>a.time_signature==='6/8'));
});
