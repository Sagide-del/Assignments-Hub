import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const journey = readFileSync(
  new URL('../src/features/student/music-production/MusicJourney.tsx', import.meta.url),
  'utf8',
);

test('the Music Studio journey keeps all five guided activities and visible CC0 provenance', () => {
  for (const activity of ['rhythm', 'melody', 'instrument', 'composition', 'production']) {
    assert.match(journey, new RegExp(`"${activity}"`));
  }
  assert.match(journey, /76 bundled CC0\/original audio assets/);
  assert.match(journey, /samples\.json/);
  assert.match(journey, /LICENSE-CC0\.txt/);
  assert.match(journey, /not substitutes for local practitioners/);
});
