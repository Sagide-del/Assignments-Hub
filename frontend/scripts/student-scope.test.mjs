import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/utils/studentContentScope.ts',import.meta.url),'utf8');
const{outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}});
const{studentToolAvailable:visible}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const scope=(grade,labs,skills,csl=grade>=10)=>({grade,availability:{labs,skills,csl}});
test('sidebar and dashboard tools use published content counts, not the pathway name',()=>{
 assert.equal(visible('/student/stem-labs',scope(10,0,2)),false);
 assert.equal(visible('/student/learn-skills',scope(10,0,2)),true);
 assert.equal(visible('/student/stem-labs',scope(8,3,0)),true);
 assert.equal(visible('/student/learn-skills',scope(8,3,0)),false);
});
test('CSL is senior-only even with an inconsistent availability flag',()=>{
 for(const grade of [1,6,7,8,9,13])assert.equal(visible('/student/csl',scope(grade,1,1,true)),false);
 for(const grade of [10,11,12])assert.equal(visible('/student/csl',scope(grade,1,1)),true);
});
test('unknown or unavailable scope hides conditional tools while retaining assignments',()=>{
 for(const path of ['/student/stem-labs','/student/learn-skills','/student/csl'])assert.equal(visible(path,undefined),false);
 assert.equal(visible('/student/my-assignments',undefined),true);
});
