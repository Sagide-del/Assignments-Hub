import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load-typescript.mjs';
const { COMPETENCIES, FRAMEWORK, gradeDesignLink, levelContext } =
  await loadTypeScript(
    new URL('../src/features/student/curriculum/framework.ts', import.meta.url),
  );
const { assignmentDesign, skillDesign, stemDesign } = await loadTypeScript(
  new URL(
    '../src/features/student/curriculum/activity-designs.ts',
    import.meta.url,
  ),
);
const { learningPacks } = await loadTypeScript(
  new URL(
    '../src/features/student/skill-workspace/content/index.ts',
    import.meta.url,
  ),
);
const { formatAssignmentBrief, readAssignmentBrief } = await loadTypeScript(
  new URL(
    '../src/features/student/curriculum/assignment-brief.ts',
    import.meta.url,
  ),
);
const { reviewRecord, validReview, readReviews, reviewKey, reviewText } =
  await loadTypeScript(
    new URL(
      '../src/features/student/curriculum/learning-journal.ts',
      import.meta.url,
    ),
  );

test('framework taxonomy and page references match the supplied 2017 framework', () => {
  assert.equal(FRAMEWORK.year, 2017);
  assert.equal(FRAMEWORK.pages.competencies, 21);
  assert.equal(COMPETENCIES.length, 7);
  assert.equal(new Set(COMPETENCIES.map((c) => c.id)).size, 7);
  assert.equal(levelContext('Grade 7').page, 35);
  assert.equal(levelContext('Grade 11').page, 52);
  assert.equal(levelContext('PP1').page, 29);
});
test('official grade links come from the uploaded directory; unknown grades are not invented', () => {
  assert.equal(
    gradeDesignLink('Grade 7').url,
    'https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-seven-designs/',
  );
  assert.ok(gradeDesignLink('Grade 11').url.endsWith('/grade-eleven/'));
  assert.ok(gradeDesignLink('Grade 3').url.endsWith('/lower-primary/'));
  assert.ok(gradeDesignLink(null).url.endsWith('/curriculum-designs/'));
  assert.ok(gradeDesignLink('Form 4').url.endsWith('/curriculum-designs/'));
});
test('every authored skill lesson has its actual objective, concrete evidence and review criteria', () => {
  let count = 0;
  const valid = new Set(COMPETENCIES.map((c) => c.id));
  for (const pack of learningPacks) {
    for (const lesson of pack.lessons) {
      const design = skillDesign(
        { id: 12, title: pack.title, learningOutcomes: [] },
        lesson,
      );
      count++;
      assert.equal(design.outcomes[0].statement, lesson.objective);
      assert.ok(design.outcomes[0].evidence.length > 25);
      assert.equal(design.outcomes[0].criteria.length, 3);
      assert.ok(design.outcomes[0].competencies.every((c) => valid.has(c)));
      assert.ok(design.href.endsWith(`?lesson=${lesson.key}`));
      assert.ok(!design.teacherAuthored);
    }
  }
  assert.equal(count, 40);
});
test('custom course outcomes are preserved and legacy non-text metadata is ignored', () => {
  const design = skillDesign({
    id: 77,
    title: 'Custom weaving course',
    learningOutcomes: ['Weave a simple pattern.', { outline: 'legacy' }, ''],
  });
  assert.equal(design.outcomes.length, 1);
  assert.equal(design.outcomes[0].statement, 'Weave a simple pattern.');
});

test('STEM models have activity-specific evidence, not a generic completion claim', () => {
  for (const key of [
    'js7-lab1',
    'js7-lab2',
    'js7-lab3',
    'ss-phy-10-2',
    'ss-agr-10-2',
    'ss-phy-10-8',
  ]) {
    const design = stemDesign({
      id: 1,
      key,
      title: 'Model',
      learningOutcomes: [],
    });
    assert.ok(design.outcomes[0].statement.length > 40);
    assert.equal(design.outcomes[0].criteria.length, 3);
  }
  const teacher = stemDesign({
    id: 2,
    key: 'custom',
    title: 'Teacher experiment',
    learningOutcomes: ['Compare two leaf shapes.'],
  });
  assert.equal(teacher.outcomes[0].statement, 'Compare two leaf shapes.');
});
test('teacher learning brief survives the existing description API and takes priority over study suggestions', () => {
  const brief = {
    outcome: 'Compare two methods.',
    evidence: 'A comparison table.',
    criteria: ['Use evidence.', 'Explain a limitation.'],
    connection: 'School garden.',
    support: 'Agreed format.',
    feedback: 'Revise after feedback.',
  };
  const description =
    'Original teacher instructions.\n\n' + formatAssignmentBrief(brief);
  assert.deepEqual(readAssignmentBrief(description), brief);
  assert.deepEqual(
    readAssignmentBrief(description.replace(/\n/g, '\r\n')),
    brief,
  );
  const design = assignmentDesign({
    id: 3,
    title: 'Investigation',
    subject: 'Science',
    description,
  });
  assert.equal(design.teacherAuthored, true);
  assert.equal(design.outcomes[0].statement, brief.outcome);
  assert.equal(design.outcomes[0].evidence, brief.evidence);
  assert.equal(readAssignmentBrief('Ordinary instructions'), null);
  assert.equal(
    assignmentDesign({ id: 3, title: 'Fractions', subject: 'Mathematics' })
      .teacherAuthored,
    undefined,
  );
});
test('personal evidence is scoped by learner, validates stored data and exports outcome/status pairs', () => {
  const design = assignmentDesign({
    id: 3,
    title: 'Fractions',
    subject: 'Mathematics',
  });
  const record = reviewRecord(
    design,
    'My own worked example.',
    'Try another example.',
    { improve: 'NOT_YET', apply: 'PRACTISING' },
  );
  assert.ok(validReview(record));
  const data = new Map([
    [reviewKey(42, design.id), JSON.stringify(record)],
    [
      reviewKey(99, design.id),
      JSON.stringify({ ...record, evidence: 'Another learner' }),
    ],
    [reviewKey(42, 'broken'), '{broken'],
    ['unrelated', 'ignored'],
  ]);
  const storage = {
    get length() {
      return data.size;
    },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (key) => data.get(key) ?? null,
  };
  assert.equal(readReviews(storage, 42).length, 1);
  assert.equal(readReviews(storage, 42)[0].evidence, 'My own worked example.');
  assert.notEqual(reviewKey(42, design.id), reviewKey(99, design.id));
  const text = reviewText([record]);
  assert.ok(text.includes(`${record.statements[0]}: I am practising`));
  assert.ok(text.includes(`${record.statements[1]}: I need help`));
  assert.ok(text.includes('not a teacher assessment'));
  assert.equal(validReview({ ...record, href: 'javascript:alert(1)' }), false);
  assert.equal(
    validReview({ ...record, reviews: { apply: 'MASTERED' } }),
    false,
  );
});
