import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load-typescript.mjs';
const {
  investigationFor,
  modelResult,
  emptyDraft,
  notebookReady,
  notebookKey,
} = await loadTypeScript(
  new URL(
    '../src/features/student/stem-workspace/investigations.ts',
    import.meta.url,
  ),
);
test('only explicitly authored lab keys enable a working model', () => {
  for (const key of [
    'js7-lab1',
    'js7-lab2',
    'js7-lab3',
    'ss-phy-10-2',
    'ss-agr-10-2',
    'ss-phy-10-8',
  ]) {
    const pack = investigationFor({ key });
    assert.equal(pack.steps.length, 3);
    assert.ok(pack.safety && pack.limitation && pack.controls && pack.transfer);
  }
  assert.equal(
    investigationFor({ key: 'unpublished-custom-circuit' }),
    undefined,
  );
});
test('circuit current follows Ohm’s law; open path carries no current', () => {
  assert.equal(modelResult('circuit', 2, 10).value, 0.2);
  assert.equal(modelResult('circuit', 4, 10).value, 0.4);
  assert.equal(modelResult('circuit', 6, 0).value, 0);
});
test('pendulum period scales with square root of length, independent of mass', () => {
  const short = modelResult('pendulum', 0.25, 1).value;
  assert.equal(modelResult('pendulum', 1, 1).value, short * 2);
  assert.equal(modelResult('pendulum', 1, 3).value, short * 2);
});
test('photon threshold depends on frequency, not intensity', () => {
  assert.equal(modelResult('photoelectric', 4, 1).value, 0);
  assert.equal(modelResult('photoelectric', 4, 3).value, 0);
  assert.ok(modelResult('photoelectric', 6, 1).value > 0);
  assert.equal(
    modelResult('photoelectric', 6, 1).value,
    modelResult('photoelectric', 6, 3).value,
  );
});
test('illustrative environmental models expose a consistent comparison', () => {
  assert.equal(modelResult('filter', 0, 1).value, 100);
  assert.equal(modelResult('filter', 3, 1).value, 15);
  assert.ok(
    modelResult('plant', 6, 1).value > modelResult('plant', 6, 0).value,
  );
  assert.equal(modelResult('hydroponics', 6, 1).value, 100);
  assert.ok(modelResult('hydroponics', 4, 1).value < 100);
});
test('completion needs real notebook evidence; empty activities never complete', () => {
  const draft = emptyDraft();
  assert.equal(notebookReady(draft, 0, [], [], false), false);
  Object.assign(draft, {
    prediction: 'A prediction',
    observations: 'Measurements',
    conclusion: 'Evidence supports this',
    checked: [0, 1, 2],
    trials: [
      { setting: 'a', result: '1' },
      { setting: 'b', result: '2' },
    ],
  });
  assert.equal(notebookReady(draft, 3, [], [], true), false);
  draft.trials.push({ setting: 'c', result: '3' });
  assert.equal(notebookReady(draft, 3, [], [], true), true);
  assert.equal(notebookReady(draft, 3, [42], [7], true), false);
  draft.answers[42] = 'Answer';
  draft.reflections[7] = 'Reflection';
  assert.equal(notebookReady(draft, 3, [42], [7], true), true);
  draft.checked = [0, 1, 99];
  assert.equal(notebookReady(draft, 3, [42], [7], true), false);
  assert.notEqual(notebookKey(1, 3), notebookKey(2, 3));
  assert.notEqual(notebookKey(1, 3), notebookKey(1, 4));
});
