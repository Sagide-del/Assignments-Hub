import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateBlog, posts } from './generate-public-blog.mjs';

test('generates five searchable branded blog articles', async () => {
  const root = await mkdtemp(join(tmpdir(), 'assignment-hub-blog-'));
  await writeFile(join(root, 'sitemap.xml'), '<?xml version="1.0"?><urlset></urlset>');
  await generateBlog(root);
  assert.equal(posts.length, 5);
  assert.equal(new Set(posts.map((post) => post.slug)).size, 5);
  const index = await readFile(join(root, 'blog', 'index.html'), 'utf8');
  assert.match(index, /Kenyan Parent/);
  for (const post of posts) {
    const html = await readFile(join(root, 'blog', post.slug, 'index.html'), 'utf8');
    assert.ok(html.includes(post.title));
    assert.match(html, /Assignment Hub Team/);
    assert.match(html, /application\/ld\+json/);
    assert.match(html, /Try free revision/);
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const faq = schema['@graph'].find(item => item['@type'] === 'FAQPage');
    assert.equal(faq.mainEntity.length, 3);
    for (const question of faq.mainEntity) assert.ok(html.includes(question.name));
    assert.match(html, /href="\/revision\/grade-7-mathematics-fractions\/"/);
    assert.match(html, /KES 300\/month/);
    assert.match(html, /Related parent guides/);
  }
  const sitemap = await readFile(join(root, 'sitemap.xml'), 'utf8');
  assert.match(sitemap, /cbc-grading-levels-explained/);
});
