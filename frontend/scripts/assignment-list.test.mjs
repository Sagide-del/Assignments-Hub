import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Exercise the same TypeScript used by the UI without adding a test framework.
const source = readFileSync(new URL('../src/features/student/assignment-list.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { assignmentState, assignmentDeadline, selectAssignments } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const filters = { subject: '', state: 'ALL', search: '', sort: 'priority' };
const assignment = (id, extra = {}) => ({ id, title: `Assignment ${id}`, subject: 'Mathematics', isPublished: true, createdAt: '2026-10-01T10:00:00Z', ...extra });

test('graded results stay submitted until released and drafts remain in progress', () => {
  assert.equal(assignmentState(), 'NOT_STARTED');
  assert.equal(assignmentState({ status: 'DRAFT', resultsReleasedAt: null }), 'IN_PROGRESS');
  assert.equal(assignmentState({ status: 'GRADED', resultsReleasedAt: null }), 'SUBMITTED');
  assert.equal(assignmentState({ status: 'GRADED', resultsReleasedAt: '2026-10-25T10:00:00Z' }), 'RESULTS_AVAILABLE');
});

test('deadlines use Kenyan calendar dates across midnight and preserve exact times', () => {
  const beforeMidnight = new Date('2026-10-26T20:30:00Z'); // 23:30 EAT
  assert.equal(assignmentDeadline('2026-10-26T21:30:00Z', beforeMidnight).label, 'Due tomorrow');
  const afterMidnight = new Date('2026-10-26T21:05:00Z');
  const due = assignmentDeadline('2026-10-26T21:30:00Z', afterMidnight);
  assert.equal(due.label, 'Due today');
  assert.match(due.detail, /27 Oct 2026 at 00:30 EAT/);
  assert.equal(assignmentDeadline('2026-10-26T21:00:00Z', afterMidnight).isPast, true);
  assert.match(assignmentDeadline('2026-10-26T21:00:00Z', afterMidnight).label, /Deadline passed/);
  assert.equal(assignmentDeadline(null, afterMidnight).label, 'No deadline');
  assert.equal(assignmentDeadline('invalid', afterMidnight).label, 'Deadline unavailable');
});

test('unfinished deadlines come before completed work, without hiding overdue or undated tasks', () => {
  const assignments = [
    assignment(1, { dueDate: '2026-09-01T10:00:00Z' }),
    assignment(2, { dueDate: '2026-10-29T10:00:00Z' }),
    assignment(3),
    assignment(4, { dueDate: '2026-10-20T10:00:00Z' }),
    assignment(5, { isPublished: false }),
  ];
  const submissions = new Map([[1, { status: 'GRADED', resultsReleasedAt: '2026-09-02T10:00:00Z' }]]);
  assert.deepEqual(selectAssignments(assignments, submissions, filters).map((item) => item.id), [4, 2, 3, 1]);
  assert.deepEqual(selectAssignments(assignments, submissions, { ...filters, sort: 'deadline' }).map((item) => item.id), [1, 4, 2, 3]);
});

test('subject, search and status filters combine and blank subjects remain selectable', () => {
  const assignments = [assignment(1, { title: 'Fractions' }), assignment(2, { subject: '  ', title: 'Revision' }), assignment(3, { subject: 'Science', title: 'Fractions in measurement' })];
  const submissions = new Map([[1, { status: 'DRAFT' }]]);
  assert.deepEqual(selectAssignments(assignments, submissions, { ...filters, subject: 'Mathematics', state: 'IN_PROGRESS', search: ' FRACTIONS ' }).map((item) => item.id), [1]);
  assert.deepEqual(selectAssignments(assignments, submissions, { ...filters, subject: 'General' }).map((item) => item.id), [2]);
  assert.equal(selectAssignments(assignments, submissions, { ...filters, state: 'SUBMITTED' }).length, 0);
});

test('newest sorting follows creation dates independently of deadlines and never mutates input', () => {
  const assignments = [assignment(1), assignment(2, { createdAt: '2026-10-25T10:00:00Z' })];
  assert.deepEqual(selectAssignments(assignments, new Map(), { ...filters, sort: 'newest' }).map((item) => item.id), [2, 1]);
  assert.deepEqual(assignments.map((item) => item.id), [1, 2]);
});
