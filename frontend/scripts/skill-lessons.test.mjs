import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { loadTypeScript } from './load-typescript.mjs';
const { learningPacks } = await loadTypeScript(new URL('../src/features/student/skill-workspace/content/index.ts', import.meta.url));
const { courseLessons, summarizeSkillProgress, workspaceModeForCourse } = await loadTypeScript(new URL('../src/features/student/skill-workspace/workspace-mode.ts', import.meta.url));
const { checkPractice, applyRobotCommands, cleanOutput, draftKey, explainPythonError } = await loadTypeScript(new URL('../src/features/student/skill-workspace/workspace-tools.ts', import.meta.url));

test('all ten programmes contain distinct lessons, activities and explained checks', () => {
 assert.equal(learningPacks.length, 10);
 const keys = new Set();
 for (const pack of learningPacks) {
  assert.ok(pack.lessons.length >= 3);
  for (const lesson of pack.lessons) {
   assert.ok(!keys.has(lesson.key)); keys.add(lesson.key);
   assert.match(lesson.key, /^[a-z0-9][a-z0-9_-]{0,79}$/i);
   assert.ok(lesson.objective && lesson.sections.length >= 3 && lesson.activity.steps.length >= 2);
   assert.ok(lesson.check.answer >= 0 && lesson.check.answer < lesson.check.options.length);
   assert.ok(lesson.check.explanation.length > 30);
   if (lesson.starterCode !== undefined) assert.ok(lesson.solution && lesson.expectedOutput !== undefined);
   if (lesson.image) assert.ok(existsSync(new URL('../public' + lesson.image.src, import.meta.url)));
  }
 }
 assert.equal(keys.size, 40);
});

test('expanded paths do not reinterpret old outline completions as new lessons', () => {
 const course = {title:'Python Programming Foundations', category:{name:'Coding'},costKES:0,courseStructure:['Legacy outcome']};
 assert.equal(courseLessons(course).length, 8);
 assert.equal(summarizeSkillProgress(course,[{lessonKey:'lesson-1',completedAt:'2026-10-01',updatedAt:'2026-10-01'}]).completed,0);
 assert.equal(workspaceModeForCourse({title:'Cyber Safety and Networking',category:{name:'Coding & Digital Technology'}}),'GUIDED');
});

test('custom course outlines remain intact and are not replaced by invented curriculum', () => {
 assert.equal(courseLessons({title:'Custom course',courseStructure:['Teacher lesson'],learningOutcomes:[],shortDescription:'Custom'})[0].title,'Teacher lesson');
});

test('every Python worked solution runs and matches its task output', () => {
 const pack = learningPacks.find(pack=>pack.title==='Python Programming Foundations');
 for (const lesson of pack.lessons) {
  const result=execFileSync('python',['-c',lesson.solution],{input:lesson.input?lesson.input+'\n':'',encoding:'utf8',timeout:5000});
  assert.equal(checkPractice(result,lesson.expectedOutput),true,lesson.title);
 }
});

test('robot commands are checked against position and output, including zero steps', () => {
 const commands='__ROBOT_COMMANDS__'+JSON.stringify([{command:'forward',value:2},{command:'turn_right',value:1},{command:'forward',value:2}]);
 assert.deepEqual(applyRobotCommands(commands),{x:4,y:4,direction:2});
 assert.equal(checkPractice('Route complete\n'+commands,'Route complete',{x:4,y:4,direction:2}),true);
 assert.equal(checkPractice('Route complete','Route complete',{x:4,y:4,direction:2}),false);
 assert.deepEqual(applyRobotCommands('__ROBOT_COMMANDS__[{"command":"forward","value":0}]'),{x:2,y:2,direction:1});
 assert.equal(cleanOutput('Hello\n'+commands),'Hello');
});

test('draft keys are learner/course/lesson scoped and errors explain common beginner problems', () => {
 assert.notEqual(draftKey(1,2,'a'),draftKey(2,2,'a'));
 assert.notEqual(draftKey(1,2,'a'),draftKey(1,3,'a'));
 assert.match(explainPythonError('NameError: name missing is not defined'),/spelling/);
 assert.match(explainPythonError('EOFError'),/input/);
});

test('first aid has six illustrated response guides with two explained scenarios each', () => {
 const pack=learningPacks.find(pack=>pack.title==='First Aid Foundations');
 assert.equal(pack.version,'firstaid-v2');
 for(const lesson of pack.lessons){
  assert.match(lesson.key,/^firstaid-v2-/);
  assert.ok(lesson.firstAid.actions.length>=4);
  assert.ok(lesson.firstAid.actions.every(step=>step.text.length>80&&step.why.length>50));
  assert.ok(lesson.firstAid.recognise.length>=3&&lesson.firstAid.avoid.length>=3&&lesson.firstAid.urgent.length>=2);
  assert.equal(lesson.firstAid.scenarios.length,2);
  assert.match(lesson.image.src,/\.webp$/);
  for(const image of [lesson.image,...lesson.images])assert.ok(existsSync(new URL('../public'+image.src,import.meta.url)));
  for(const scenario of lesson.firstAid.scenarios){assert.ok(scenario.answer>=0&&scenario.answer<scenario.options.length);assert.ok(scenario.situation.length>60&&scenario.explanation.length>60);}
  assert.ok(lesson.sources.every(source=>source.url.startsWith('https://')));
 }
 const firstAidCourse={title:pack.title,category:{name:'First Aid'},costKES:0};
 assert.equal(summarizeSkillProgress(firstAidCourse,[{lessonKey:'firstaid-v1-fainting',completedAt:'2026-10-01',updatedAt:'2026-10-01'}]).completed,0);
});
