import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load-typescript.mjs';
const { recallVisual } = await loadTypeScript(new URL('../src/features/student/recall-visual.ts', import.meta.url));
const content = {version:1,cue:'Explain the heart chambers.',mnemonic:'A useful aid',explanation:'A detailed explanation.',facts:[{label:'First idea',meaning:'An accurate first fact.'},{label:'Second idea',meaning:'An accurate second fact.'}],checks:[],sourceIds:[]};
test('existing biology cards get a labelled anatomical asset without changing stored content',()=>{
  const snapshot=JSON.stringify(content);
  assert.equal(recallVisual(content,{subject:'Biology',title:'Heart chambers'}).template,'heart');
  assert.equal(JSON.stringify(content),snapshot);
});
test('literary references to the heart do not acquire an unrelated anatomy illustration',()=>{
  assert.equal(recallVisual(content,{subject:'English',title:'A poem about the heart'}).kind,'concept-map');
});
test('authored diagram metadata is retained and unsupported subjects use their real facts',()=>{
  const visual={kind:'comparison',title:'Compare the ideas',labels:[{label:'A',detail:'First fact.'},{label:'B',detail:'Second fact.'}]};
  assert.deepEqual(recallVisual({...content,visual},{subject:'English'}),visual);
  assert.deepEqual(recallVisual({...content,cue:'Explain the two ideas.'},{subject:'History'}).labels,content.facts.map(f=>({label:f.label,detail:f.meaning})));
});
test('legacy long facts remain intact while editable diagram labels fit the stored visual schema',()=>{
  const old={...content,facts:[{label:'A'.repeat(100),meaning:'B'.repeat(400)},{label:'Second',meaning:'Another fact.'}]};
  const visual=recallVisual(old,{subject:'History'});
  assert.equal(visual.labels[0].label.length,70);
  assert.equal(visual.labels[0].detail.length,220);
  assert.equal(old.facts[0].meaning.length,400);
});
