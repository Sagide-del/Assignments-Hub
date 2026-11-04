import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load-typescript.mjs';
const { validateIllustration } = await loadTypeScript(new URL('../src/components/ExamDiagrams/blueprint.ts', import.meta.url));
const circuit={type:'SVG_BLUEPRINT',blueprint:{apparatus_type:'circuit',parameters:{arrangement:'parallel',components:['battery','switch','bulb','bulb']}}};
test('blueprints accept the supplied parallel circuit and optional illustrations',()=>{assert.deepEqual(validateIllustration(circuit),circuit);assert.equal(validateIllustration(null),null);assert.equal(validateIllustration(undefined),null);});
test('invalid SVG/code, topology and nested parameters are rejected',()=>{for(const value of [{type:'SVG',svg:'<script/>'},{...circuit,blueprint:{apparatus_type:'<svg onload=x>',parameters:{}}},{...circuit,blueprint:{...circuit.blueprint,parameters:{...circuit.blueprint.parameters,svg:'<svg/>'}}},{...circuit,blueprint:{...circuit.blueprint,parameters:{arrangement:'parallel',components:['battery','bulb']}}}])assert.throws(()=>validateIllustration(value));});
test('unknown apparatus remains inert metadata for the pending placeholder',()=>{assert.equal(validateIllustration({type:'SVG_BLUEPRINT',blueprint:{apparatus_type:'unimplemented_apparatus',parameters:{}}}).blueprint.apparatus_type,'unimplemented_apparatus');});
test('fractional distillation is normalized without injecting images or arbitrary labels',()=>{assert.deepEqual(validateIllustration({type:'SVG_BLUEPRINT',blueprint:{apparatus_type:'fractional-distillation',parameters:{showLabels:false}}}),{type:'SVG_BLUEPRINT',blueprint:{apparatus_type:'fractional_distillation',parameters:{showLabels:false}}});});
