import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load-typescript.mjs';
const { validAnswers, mockDraftKey, resultAreas, resultText } =
  await loadTypeScript(
    new URL('../src/features/student/kjsea/mock-tools.ts', import.meta.url),
  );
const questions = [
  {
    id: 'q-1',
    topic: 'Area',
    area: 'Measurement',
    prompt: 'Find the area.',
    options: ['8 cm²', '9 cm²', '10 cm²', '11 cm²'],
    correctIndex: 0,
    explanation: '2 × 4 = 8 cm².',
    visual: { kind: 'rectangle', width: 4, height: 2 },
  },
  {
    id: 'q-2',
    topic: 'Tables',
    area: 'Data',
    prompt: 'Read the table.',
    options: ['2', '3', '4', '5'],
    correctIndex: 1,
    explanation: 'The table shows 3.',
    visual: {
      kind: 'table',
      caption: 'Data',
      headings: ['Value', 'Frequency'],
      rows: [['3', '2']],
    },
  },
];
test('browser backups keep only valid question choices and are scoped per learner and paper', () => {
  assert.deepEqual(
    validAnswers({ 'q-1': 0, 'q-2': 4, 'q-8': 2, extra: 'text' }, questions),
    { 'q-1': 0 },
  );
  assert.deepEqual(validAnswers(null, questions), {});
  assert.notEqual(mockDraftKey(42, 'one'), mockDraftKey(43, 'one'));
  assert.notEqual(mockDraftKey(42, 'one'), mockDraftKey(42, 'two'));
});
test('topic feedback compares the released server key with saved answers', () => {
  assert.deepEqual(resultAreas({ questions, answers: { 'q-1': 0 } }), [
    { area: 'Measurement', correct: 1, total: 1 },
    { area: 'Data', correct: 0, total: 1 },
  ]);
});
test('review exports include visual data, explanations and unanswered items', () => {
  const text = resultText({
    questions,
    answers: { 'q-1': 0 },
    score: 1,
    completedAt: '2026-10-27T12:00:00Z',
  });
  assert.ok(text.includes('width 4 cm, height 2 cm'));
  assert.ok(text.includes('Value | Frequency'));
  assert.ok(text.includes('Your answer: Unanswered'));
  assert.ok(text.includes('2 × 4 = 8 cm².'));
  assert.ok(text.includes('not an official KNEC paper'));
});
test('structured backups retain working and valid parts, with weighted mark feedback', () => {
  const q = { id:'q-21', topic:'Area', area:'Measurement', prompt:'Find the area.', responseType:'STRUCTURED', marks:4, parts:[{id:'a',prompt:'Area',answer:'12',marks:1}], options:[], awardedMarks:1, explanation:'Area = length × width.' };
  const answer={responses:{a:'12',forged:'ignore'},working:'3 × 4 = 12'};
  assert.deepEqual(validAnswers({'q-21':answer},[q]),{'q-21':{responses:{a:'12'},working:'3 × 4 = 12'}});
  assert.deepEqual(resultAreas({questions:[q],answers:{'q-21':answer}}),[{area:'Measurement',correct:1,total:4}]);
  const text=resultText({questions:[q],answers:{'q-21':answer},score:1,totalMarks:4});
  assert.ok(text.includes('Score: 1/4'));assert.ok(text.includes('Model answer: 12'));assert.ok(text.includes('Working: 3 × 4 = 12'));
});
