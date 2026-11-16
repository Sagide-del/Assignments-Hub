import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateBlog, posts } from './generate-public-blog.mjs';

test('generates eleven searchable branded blog articles', async () => {
  const root = await mkdtemp(join(tmpdir(), 'assignment-hub-blog-'));
  await writeFile(join(root, 'sitemap.xml'), '<?xml version="1.0"?><urlset></urlset>');
  await generateBlog(root);
  assert.equal(posts.length, 11);
  assert.equal(new Set(posts.map((post) => post.slug)).size, posts.length);
  const index = await readFile(join(root, 'blog', 'index.html'), 'utf8');
  assert.match(index, /Kenyan Parent/);
  for (const post of posts) {
    const html = await readFile(join(root, 'blog', post.slug, 'index.html'), 'utf8');
    assert.ok(html.includes(post.title));
    assert.match(html, /Assignment Hub Team/);
    assert.match(html, /application\/ld\+json/);
    assert.ok(html.includes(post.cta_config.button_text));
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(schema['@type'],'Article');
    assert(schema.citation.length>=1);
    assert.ok(html.includes(`href="${post.cta_config.button_link}"`));
    assert.match(html, /KES 300\/month/);
    assert.match(html, /career-pathway/);
  }
  const sitemap = await readFile(join(root, 'sitemap.xml'), 'utf8');
  assert.match(sitemap, /cbc-grading-levels-explained/);
});
