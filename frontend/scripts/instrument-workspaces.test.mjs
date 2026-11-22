import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import ts from 'typescript';
const compile=path=>ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const url=code=>`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const modelUrl=url(compile('../src/features/student/music-production/instrument-model.ts')),model=await import(modelUrl);
const audio=await import(url(compile('../src/features/student/music-production/instrument-audio.ts').replace(/from ['"]\.\/instrument-model['"]/,`from '${modelUrl}'`)));
const energy=s=>s.reduce((n,v)=>n+v*v,0)/s.length;
test('all original guitar and drum starters are valid four-bar drafts',()=>{
 const d=model.starter();assert(model.validDraft(d));assert.equal(d.melody.length,32);
 for(const p of Object.values(model.guitarPresets))assert(model.validDraft({...d,bpm:p.bpm,chords:p.chords,melody:Array.from({length:4},(_,bar)=>p.phrase.map((midi,i)=>({step:bar*16+i*2,midi,length:2}))).flat()}));
 for(const p of Object.values(model.drumPresets)){assert.equal(p.hits.length,8);assert(model.validDraft({...d,bpm:p.bpm,drums:p.hits.map(h=>Array.from({length:16},(_,i)=>h.includes(i)))}));}
 for(const bad of [{...d,bpm:0},{...d,chords:['bad','Am','F','G']},{...d,melody:[{step:63,midi:64,length:8}]},{...d,drums:[[true]]},null])assert.equal(model.validDraft(bad),false);
});
test('piano roll removes selected notes, bounds durations and replaces same-pitch overlaps',()=>{
 let d={...model.starter(),melody:[]};d=model.toggleNote(d,0,60,4);d=model.toggleNote(d,2,60,4);assert.deepEqual(d.melody,[{step:2,midi:60,length:4}]);d=model.toggleNote(d,2,60,4);assert.equal(d.melody.length,0);d=model.toggleNote(d,63,64,8);assert.equal(d.melody[0].length,1);assert(model.validDraft(d));
});
test('procedural guitar produces pitched, decaying audio rather than a silent placeholder',()=>{
 const rate=16000,s=audio.pluck(69,1.2,'Steel',rate);assert(energy(s)>.00001);assert(energy(s.slice(0,4000))>energy(s.slice(-4000)));
 // Autocorrelation near A4's expected period, after the initial attack.
 let best=0,bestLag=0;for(let lag=32;lag<=40;lag++){let sum=0;for(let i=800;i<4000;i++)sum+=s[i]*s[i+lag];if(sum>best){best=sum;bestLag=lag;}}
 assert(Math.abs(rate/bestLag-440)/440<.05,`A4 pitch ${rate/bestLag}`);
 assert.notDeepEqual(audio.pluck(64,1,'Nylon',8000),audio.pluck(64,1,'Steel',8000));
});
test('every percussion voice is audible and different; empty drums render silence',()=>{
 const sounds=model.DRUMS.map((_,i)=>audio.drum(i,8000));for(const s of sounds)assert(energy(s)>1e-6);for(let i=1;i<sounds.length;i++)assert.notDeepEqual(sounds[i],sounds[0]);
 const empty={...model.starter(),drums:Array.from({length:8},()=>Array(16).fill(false))};assert.equal(energy(audio.renderInstrument(empty,'drums',8000)),0);
});
test('both workspaces render bounded four-bar audio and valid PCM WAV headers',()=>{
 for(const kind of ['guitar','drums']){const d=model.starter(),rate=8000,s=audio.renderInstrument(d,kind,rate);assert.equal(s.length,Math.ceil(rate*16*60/d.bpm));assert(energy(s)>1e-5);assert(s.every(v=>Number.isFinite(v)&&Math.abs(v)<=.8));
 const bytes=audio.wavBytes(s,rate),view=new DataView(bytes),text=(offset,n)=>String.fromCharCode(...new Uint8Array(bytes,offset,n));assert.equal(text(0,4),'RIFF');assert.equal(text(8,4),'WAVE');assert.equal(view.getUint32(24,true),rate);assert.equal(view.getUint32(40,true),s.length*2);assert.equal(bytes.byteLength,s.length*2+44);}
});
