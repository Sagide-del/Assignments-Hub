import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resources } from '../content/revision.mjs';
import { renderHub, renderResource, generate } from './generate-revision.mjs';
import { scoreQuiz } from '../public/revision/assets/quiz.mjs';

test('marks correct, incorrect and incomplete attempts accurately', () => {
  assert.equal(scoreQuiz([1, 2, 0], [1, 2, 0]), 3);
  assert.equal(scoreQuiz([0, 2, 1], [1, 2, 0]), 1);
  assert.equal(scoreQuiz([], [1, 2, 0]), 0);
});

test('each quiz has valid answer indices and substantive explanations', () => {
  assert.equal(new Set(resources.map((resource) => resource.slug)).size, 3);
  for (const resource of resources) {
    assert.equal(resource.questions.length, 5);
    for (const question of resource.questions) {
      assert.equal(question.options.length, 4);
      assert.ok(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < 4);
      assert.ok(question.explanation.length > 50);
    }
    assert.equal(scoreQuiz(resource.questions.map((question) => question.answer), resource.questions.map((question) => question.answer)), 5);
  }
});

test('every page exposes unique crawlable content, canonical and valid structured data without JavaScript', () => {
  const hub = renderHub();
  for (const resource of resources) {
    const html = renderResource(resource);
    assert.ok(hub.includes(`href="/revision/${resource.slug}/"`));
    assert.ok(html.includes(`<h1>${resource.title}</h1>`));
    assert.ok(html.includes(`rel="canonical" href="https://assignmenthub.co.ke/revision/${resource.slug}/"`));
    assert.equal((html.match(/<fieldset /g) || []).length, 5);
    assert.equal((html.match(/class="worked-answer"/g) || []).length, 5);
    for (const question of resource.questions) assert.ok(html.includes(question.explanation));
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    assert.equal(schema['@graph'][0].isAccessibleForFree, true);
    assert.ok(html.includes('data-register='));
    const hostileTitle = renderResource({ ...resource, title: '<script>alert("x")</script>' });
    assert.ok(!hostileTitle.includes('<h1><script>'));
  }
});

test('generation is repeatable and preserves existing sitemap URLs', async () => {
  const sitemapPath = new URL('../public/sitemap.xml', import.meta.url);
  const before = await readFile(sitemapPath, 'utf8');
  await generate();
  const once = await readFile(sitemapPath, 'utf8');
  await generate();
  assert.equal(await readFile(sitemapPath, 'utf8'), once);
  for (const url of [...before.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1])) assert.ok(once.includes(`<loc>${url}</loc>`));
  assert.equal((once.match(/<loc>https:\/\/assignmenthub.co.ke\/revision\//g) || []).length, 4);
});
