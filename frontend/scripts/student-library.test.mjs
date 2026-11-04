import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import ts from 'typescript';
const {outputText}=ts.transpileModule(readFileSync(new URL('../src/pages/study-hub/library-model.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}});
const{filterLibrary}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const subjects=[{subject:'Mathematics',topics:[{topic:'Algebra',modules:[{id:'1'}]},{topic:'Geometry',modules:[{id:'2'}]}]},{subject:'English',topics:[{topic:'Dialogue',modules:[{id:'3'}]}]}];
test('search matches subjects case-insensitively and retains all their topics',()=>{assert.equal(filterLibrary(subjects,' MATH ')[0].topics.length,2);assert.equal(filterLibrary(subjects,'math').length,1);});
test('search narrows topics without dropping batch metadata or changing the catalogue',()=>{assert.deepEqual(filterLibrary(subjects,'algebra'),[{subject:'Mathematics',topics:[subjects[0].topics[0]]}]);assert.equal(subjects[0].topics.length,2);assert.deepEqual(filterLibrary(subjects,'missing'),[]);assert.deepEqual(filterLibrary(subjects,''),subjects);});
