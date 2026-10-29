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
const { languagePages, gapLabels, paperDuration } = await loadTypeScript(new URL('../src/features/student/kjsea/language-paper-layout.ts', import.meta.url));
test('language pages keep dialogue questions together and preserve saved question order', () => {
  const dialogue={title:'Dialogue',text:'Amina: I (1) ____ early.\nTeacher: Please (2) ____ here.'};
  const cloze={title:'Cloze',text:'We (1) ____ the field.'};
  const rows=[{id:'q-1',section:'Dialogue',passage:dialogue},{id:'q-2',section:'Dialogue',passage:dialogue},{id:'q-3',section:'Cloze',passage:cloze}];
  const pages=languagePages(rows);
  assert.equal(pages.length,2);assert.deepEqual([pages[0].first,pages[0].last],[0,1]);
  assert.deepEqual(pages[0].questions.map(q=>q.id),['q-1','q-2']);
  assert.deepEqual([...gapLabels(pages[1])],[[1,3]]);
  assert.equal(rows[2].passage.text,'We (1) ____ the field.');
});
test('reviewed HTML passages group only when identical and page ranges stay continuous', () => {
  const rows=[{id:'q-1',section:'Reading',contentHtml:'<p>First</p>'},{id:'q-2',section:'Reading',contentHtml:'<p>First</p>'},{id:'q-3',section:'Reading',contentHtml:'<p>Second</p>'},{id:'q-4',section:'Usage',contentHtml:null}];
  const pages=languagePages(rows);
  assert.deepEqual(pages.map(p=>[p.first,p.last]),[[0,1],[2,2],[3,3]]);
  assert.equal(paperDuration(80),'1 hr 20 min');assert.equal(paperDuration(120),'2 hrs');assert.equal(paperDuration(70),'1 hr 10 min');
});
