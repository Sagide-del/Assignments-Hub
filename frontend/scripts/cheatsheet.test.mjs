import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {build}=await import('esbuild');
const bundled=await build({entryPoints:[new URL('../../backend/src/cms/theory-cheatsheet.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser'});
const{validateTheoryCheatsheet,parseConceptMap}=await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const sheet={key_concepts:['Balance an equation.','Use the same operation.','Check by substitution.'],key_formulas:['ax+b=c'],common_mistakes:['Keep the sign.','Change both sides.','Check the solution.'],concept_diagram:{type:'TIKZ_CODE',latex_code:'\\begin{tikzpicture}\\node (a) at (1,3) {Equation};\\node (b) at (5,3) {Solve};\\draw[->] (a) -- (b);\\end{tikzpicture}'}};
test('the UI and backend share the same valid cheat-sheet structure',()=>{assert.deepEqual(validateTheoryCheatsheet(sheet),sheet);assert.equal(parseConceptMap(sheet.concept_diagram.latex_code).nodes.length,2);});
test('diagram commands stay inert and unsupported TeX/HTML is rejected',()=>{for(const command of ['\\input{x}','<script>bad()</script>','\\write18{bad}'])assert.throws(()=>parseConceptMap(sheet.concept_diagram.latex_code.replace('\\end{tikzpicture}',command+'\\end{tikzpicture}')));});

const readinessSource=readFileSync(new URL('./check-rotation-api.mjs',import.meta.url),'utf8');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const runReadiness=(body)=>new AsyncFunction('fetch','setTimeout','console','process','AbortSignal',readinessSource)(async()=>({ok:true,json:async()=>body}),fn=>{fn();},{log(){}},{env:{}},AbortSignal);
test('deployment waits for the visual backend and refuses an older API',async()=>{
  await assert.rejects(runReadiness({cheatsheetVersion:1,rotationVersion:1}),/new visual cheat-sheet backend/);
  await runReadiness({cheatsheetVersion:1,rotationVersion:1,cheatsheetDesignVersion:2,automaticDiagramVersion:1});
});
