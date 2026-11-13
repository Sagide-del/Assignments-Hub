import test from 'node:test';
import assert from 'node:assert/strict';
import { trackStage } from '../public/revision/assets/acquisition.mjs';
test('journey tracking deduplicates stages, sends no identity/answers and respects privacy preferences',async()=>{
 const keys=['navigator','location','sessionStorage','fetch'];const originals=Object.fromEntries(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const stored=new Map(),sent=[];let preference='0';
 try{
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{get doNotTrack(){return preference;}}});
  Object.defineProperty(globalThis,'location',{configurable:true,value:{pathname:'/revision/grade-7/mathematics/',search:'?phone=0712345678'}});
  Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)}});
  globalThis.fetch=async(url,options)=>{if(options?.method==='POST'){sent.push(JSON.parse(options.body));assert.equal(options.credentials,'omit');return {ok:true};}return {ok:true,json:async()=>({endpoint:'https://example.test/events'})};};
  await trackStage('practice_start');await trackStage('practice_start');
  assert.equal(sent.length,1);assert.deepEqual(Object.keys(sent[0]).sort(),['path','session','stage']);assert(!JSON.stringify(sent).includes('0712345678'));
  preference='1';await trackStage('practice_complete');assert.equal(sent.length,1);
  preference='0';globalThis.fetch=async()=>{throw Error('offline');};await assert.doesNotReject(trackStage('practice_complete'));
  globalThis.sessionStorage.getItem=()=>{throw Error('storage unavailable');};await assert.doesNotReject(trackStage('payment_attempt'));
 }finally{for(const k of keys){if(originals[k])Object.defineProperty(globalThis,k,originals[k]);else delete globalThis[k];}}
});
