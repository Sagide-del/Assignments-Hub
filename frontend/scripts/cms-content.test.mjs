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

test('CMS preview reads the strict AI theory_text/question_text contract', () => {
  const view=parseCmsContent({theory_text:'Lift opposes weight.',questions:[{question_text:'Which force acts upward?',options:['Lift','Weight','Thrust','Drag'],correct_answer:'Lift',explanation:'Aerodynamic lift acts upward.'}]});
  assert.equal(view.theory,'Lift opposes weight.');assert.equal(view.questions[0].prompt,'Which force acts upward?');assert.equal(view.questions[0].answer,'Lift');
});
const { cmsSchoolStreams } = await loadTypeScript(new URL('../src/services/cms-streams.ts', import.meta.url));
test('school stream choices exclude other schools, grades, staff and inactive learners', () => {
  const user=(extra={})=>({id:1,name:'Learner',email:null,admissionNumber:null,role:'STUDENT',grade:'Grade 11',isActive:true,schoolId:2,studentProfile:{stream:'1A',className:null,grade:'Grade 11'},...extra});
  const rows=[user(),user(),user({studentProfile:{stream:'1B'}}),user({schoolId:3,studentProfile:{stream:'Other school'}}),user({grade:'Grade 9',studentProfile:{stream:'Other grade'}}),user({role:'TEACHER',studentProfile:{stream:'Staff'}}),user({isActive:false,studentProfile:{stream:'Inactive'}}),user({studentProfile:{stream:null,className:'1C'}})];
  assert.deepEqual(cmsSchoolStreams(rows,2,11),['1A','1B','1C']);
});

const { cmsLearningContent } = await loadTypeScript(new URL('../src/services/cms-content.ts', import.meta.url));
test('learner content hides legacy theory, labels partial sets and safely ignores absent equations',()=>{
  const view=cmsLearningContent({source:'LEGACY',theory_text:'Legacy content migrated from old system.',questions:Array(10).fill({})});
  assert.equal(view.theory,'');assert.equal(view.label,'Practice Set (Partial)');assert.deepEqual(view.equations,[]);
  assert.deepEqual(cmsLearningContent(null).equations,[]);
  assert.equal(cmsLearningContent({questions:Array(35).fill({})}).partial,false);
  assert.equal(cmsLearningContent({theory_text:'New theory',question_count:30,equations:[]}).theory,'New theory');
});
