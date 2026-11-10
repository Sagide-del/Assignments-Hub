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
    assert.match(html, /Create free account/);
  }
  const sitemap = await readFile(join(root, 'sitemap.xml'), 'utf8');
  assert.match(sitemap, /cbc-grading-levels-explained/);
});
