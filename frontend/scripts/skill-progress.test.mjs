import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/features/student/skill-workspace/workspace-mode.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { summarizeSkillProgress, hasWorkspaceAccess } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const course = { title: 'Python practice', category: { name: 'Coding' }, costKES: 0, courseStructure: ['Variables', 'Loops', 'Functions'], learningOutcomes: [], shortDescription: 'Practise Python.' };
const record = (lessonKey, completed = true, updatedAt = '2026-10-26T09:00:00Z') => ({ lessonKey, completedAt: completed ? updatedAt : null, updatedAt });

test('unstarted progress has a first lesson and no fabricated completions', () => {
  const result = summarizeSkillProgress(course, []);
  assert.equal(result.completed, 0);
  assert.equal(result.percent, 0);
  assert.equal(result.nextLesson.title, 'Variables');
  assert.equal(result.hasActivity, false);
});

test('removed and duplicate lesson records never inflate progress', () => {
  const result = summarizeSkillProgress(course, [record('lesson-1'), record('lesson-1'), record('removed-lesson')]);
  assert.equal(result.completed, 1);
  assert.equal(result.total, 3);
  assert.equal(result.percent, 33);
  assert.equal(result.nextLesson.title, 'Loops');
});

test('completion reflects all current lesson keys, not record count', () => {
  const result = summarizeSkillProgress(course, [record('lesson-1'), record('lesson-2', false), record('lesson-3')]);
  assert.equal(result.completed, 2);
  assert.equal(result.nextLesson.title, 'Loops');
  assert.equal(summarizeSkillProgress(course, [record('lesson-1'), record('lesson-2'), record('lesson-3')]).nextLesson, null);
});

test('latest activity is selected from relevant records only', () => {
  const result = summarizeSkillProgress(course, [record('lesson-1', true, '2026-10-20T09:00:00Z'), record('lesson-2', false, '2026-10-25T09:00:00Z'), record('removed', true, '2026-10-30T09:00:00Z')]);
  assert.equal(result.latestActivity, Date.parse('2026-10-25T09:00:00Z'));
  assert.equal(result.hasActivity, true);
});

test('course access follows the existing enrollment rules', () => {
  assert.equal(hasWorkspaceAccess(course), true);
  assert.equal(hasWorkspaceAccess({ ...course, costKES: 500 }), false);
  assert.equal(hasWorkspaceAccess({ ...course, costKES: 500, enrollment: { status: 'REQUESTED' } }), false);
  assert.equal(hasWorkspaceAccess({ ...course, costKES: 500, enrollment: { status: 'ACTIVE' } }), true);
  assert.equal(hasWorkspaceAccess({ ...course, costKES: 500, enrollment: { status: 'COMPLETED' } }), true);
});
