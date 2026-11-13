import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../public',import.meta.url),read=url=>readFileSync(new URL('.'+url,root+'/'));
const samples=JSON.parse(read('/assets/music/recorded/samples.json')),arrangement=JSON.parse(read('/assets/music/recorded/play-along.json'));
test('recorded instruments and aligned backing stems have pinned CC0 provenance and intact audio',()=>{assert.equal(samples.license,'CC0-1.0');assert.equal(samples.authentic_isukuti,false);assert.match(read('/assets/music/recorded/LICENSE-CC0.txt').toString(),/CC0/);assert.equal(arrangement.stems.length,5);assert.equal(arrangement.musical_duration,4*4*60/arrangement.bpm);for(const asset of [...samples.samples,...arrangement.stems]){const bytes=read(asset.url);assert.equal(bytes.length,asset.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);assert.ok(bytes.length>1000);if(asset.source_url)assert.ok(asset.source_url.includes(samples.source_revision));if(asset.waveform){assert.equal(asset.waveform.length,128);assert.ok(asset.waveform.some(n=>n>0.01));}}});
