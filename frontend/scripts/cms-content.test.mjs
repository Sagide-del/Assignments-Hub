import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load-typescript.mjs';
const { parseCmsContent } = await loadTypeScript(new URL('../src/services/cms-content.ts', import.meta.url));

test('CMS preview reads saved theory, assets and all thirty questions without padding', () => {
  const source = { theory: 'Four forces of flight.', assets: [{ url: '/models/aircraft.glb' }], questions: Array.from({ length: 30 }, (_, i) => ({ question: `Question ${i+1}`, answer: `Answer ${i+1}` })) };
  const view = parseCmsContent(source);
  assert.equal(view.valid,true); assert.equal(view.theory,source.theory); assert.equal(view.questions.length,30); assert.deepEqual(view.assets,['/models/aircraft.glb']);
  assert.equal(view.questions[0].answer,'Answer 1'); assert.equal(view.questions[29].prompt,'Question 30');
});
test('CMS preview supports serialized JSON and structured theory sections', () => {
  const view = parseCmsContent(JSON.stringify({ theory: [{ title:'Lift', content:'The upward force.' }], asset_url:'https://example.test/plane.glb', questions:[{questionText:'Name the force.',correctAnswer:'Lift'}] }));
  assert.equal(view.theory,'Lift\nThe upward force.'); assert.equal(view.questions.length,1); assert.equal(view.questions[0].answer,'Lift');
});
test('CMS answer parsing preserves false and zero and resolves a valid option index', () => {
  const view = parseCmsContent({questions:[{prompt:'True or false?',correct_answer:false},{prompt:'How many?',answer:0},{prompt:'Select.',options:['One','Two'],correctIndex:1}]});
  assert.deepEqual(view.questions.map(q=>q.answer),['false','0','Two']);
});
test('CMS preview reports missing and malformed content instead of inventing lessons or answers', () => {
  assert.equal(parseCmsContent('not json').valid,false); assert.equal(parseCmsContent(null).valid,false); assert.equal(parseCmsContent([]).valid,false);
  const view=parseCmsContent({questions:[{}]}); assert.equal(view.questions.length,1); assert.equal(view.questions[0].answer,'No answer supplied'); assert.equal(view.questions[0].prompt,'No question text supplied');
});
test('CMS preview retains potentially hostile strings as inert text and deduplicates asset labels', () => {
  const hostile='<img src=x onerror=alert(1)>';
  const view=parseCmsContent({theory:hostile,assets:['/model.glb','/model.glb'],questions:[{question:hostile,answer:hostile}]});
  assert.equal(view.theory,hostile); assert.equal(view.questions[0].answer,hostile); assert.deepEqual(view.assets,['/model.glb']);
});
