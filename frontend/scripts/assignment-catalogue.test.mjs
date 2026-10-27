import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load-typescript.mjs';
const { assignmentTopic, groupAssignments, matchesAssignmentSearch } = await loadTypeScript(new URL('../src/features/student/assignment-catalogue.ts',import.meta.url));
const { selectAssignments } = await loadTypeScript(new URL('../src/features/student/assignment-list.ts',import.meta.url));
const task=(id,title,extra={})=>({id,title,subject:'Chemistry',isPublished:true,createdAt:'2026-10-20T09:00:00Z',...extra});
test('topic labels prefer supplied metadata and clean titles without claiming syllabus mapping',()=>{
  assert.equal(assignmentTopic(task(1,'Quiz 1',{topic:'Amount of substance'})),'Amount of substance');
  assert.equal(assignmentTopic(task(1,'Quiz 1',{description:'Instructions\nTopic: Gas Laws\nShow units.'})),'Gas Laws');
  for(const title of ['Gas Laws – Quiz 2','Chemistry: Gas Laws - Assignment 1','Revision Gas Laws','Test 2: Gas Laws']) assert.equal(assignmentTopic(task(1,title)),'Gas Laws');
  assert.equal(assignmentTopic(task(1,'The Mole')),'The Mole');
  assert.equal(assignmentTopic(task(1,'Assignment 12')),'General practice');
  assert.equal(assignmentTopic(task(1,'Chemistry')),'General practice');
});
test('subject and topic folders merge casing/whitespace variants and exclude unpublished work',()=>{
  const rows=[task(1,'Revision Gas Laws'),task(2,'Gas laws - Quiz 2',{subject:' chemistry '}),task(3,'The Mole'),task(4,'Hidden',{isPublished:false})];
  const before=JSON.stringify(rows);const groups=groupAssignments(rows);
  assert.equal(groups.length,1);assert.equal(groups[0].assignments.length,3);assert.equal(groups[0].topics.length,2);
  assert.deepEqual(groups[0].topics[0].assignments.map(a=>a.id),[1,2]);assert.equal(JSON.stringify(rows),before);
});
test('the same topic name in different subjects stays in separate subject folders',()=>{
  const groups=groupAssignments([task(1,'Energy'),task(2,'Energy',{subject:'Physics'})]);
  assert.deepEqual(groups.map(s=>s.name),['Chemistry','Physics']);
  assert.deepEqual(groups.map(s=>s.topics[0].assignments.map(a=>a.id)),[[1],[2]]);
});
test('search finds explicit topic labels as well as assignment titles and subjects',()=>{
  const row=task(1,'Quiz 1',{topic:'Atomic structure'});
  assert.ok(matchesAssignmentSearch(row,'  ATOMIC  '));assert.ok(matchesAssignmentSearch(row,'chemistry'));assert.ok(matchesAssignmentSearch(row,'quiz 1'));assert.equal(matchesAssignmentSearch(row,'biology'),false);
});
test('topic groups preserve priority ordering and released-result status filters',()=>{
  const rows=[task(1,'The Mole - Quiz 1',{dueDate:'2026-10-28T09:00:00Z'}),task(2,'The Mole - Quiz 2',{dueDate:'2026-10-29T09:00:00Z'}),task(3,'Gas Laws')];
  const submissions=new Map([[1,{assignmentId:1,status:'GRADED',score:10,resultsReleasedAt:null}],[2,{assignmentId:2,status:'DRAFT'}]]);
  const selected=selectAssignments(rows,submissions,{subject:'',state:'ALL',search:'',sort:'priority'});
  assert.deepEqual(groupAssignments(selected)[0].topics.find(t=>t.name==='The Mole').assignments.map(a=>a.id),[2,1]);
  assert.equal(groupAssignments(selectAssignments(rows,submissions,{subject:'',state:'RESULTS_AVAILABLE',search:'',sort:'priority'})).length,0);
});

test('math spelling variants form one subject folder',()=>{
 const groups=groupAssignments([task(1,'Surds',{subject:'Mathematic'}),task(2,'Algebra',{subject:'Maths'}),task(3,'Geometry',{subject:'Mathematics'})]);
 assert.equal(groups.length,1);assert.equal(groups[0].name,'Mathematics');assert.equal(groups[0].assignments.length,3);
});
