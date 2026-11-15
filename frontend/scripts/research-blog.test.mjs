import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {article,generateBlog,posts} from './generate-public-blog.mjs';
import {countWords} from '../content/research-guides.mjs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as Lucide from 'lucide-react';
const copy=html=>html.match(/<body[^>]*>([\s\S]*?)<\/body>/)[1].replace(/<script[\s\S]*?<\/script>/g,'').replace(/<[^>]+>/g,' ');
test('every complete blog document stays under 400 words and cites its research limits',()=>{
 assert.equal(posts.length,7);
 for(const post of posts){
  const html=article(post),words=countWords(copy(html));assert(words<=400,`${post.slug}: ${words}`);
  assert.equal((html.match(/class="research-insight"/g)||[]).length,1);assert(html.includes('What the Research Says'));
  assert(html.includes('How This Connects to Your Child’s Career'));assert(post.research.text.length>100);
  for(const source of post.research.sources){assert(source.url.startsWith('https://doi.org/'));assert(html.includes(source.url));assert(html.includes(source.label.replaceAll('&','&amp;')));}
  assert.equal((html.match(/data-topic-cta=/g)||[]).length,1,'One CTA, no repeated bottom advertisement');
  const expected=renderToStaticMarkup(createElement(Lucide[post.icon],{'aria-hidden':true,'data-lucide':post.icon,size:48,strokeWidth:1.7}));assert(html.includes(expected));assert(html.includes('data-lucide="Lightbulb"'));
 }
});
test('index has seven numbered Lucide themes and the Career Compass participates in attribution',async()=>{
 const root=await mkdtemp(join(tmpdir(),'research-blog-'));await writeFile(join(root,'sitemap.xml'),'<urlset></urlset>');await generateBlog(root);
 const index=await readFile(join(root,'blog/index.html'),'utf8');
 for(const [i,p] of posts.entries()){assert(index.includes(`href="/blog/${p.slug}/"`));assert(index.includes(`data-lucide="${p.icon}"`));assert(index.includes(`<span class="topic-number">${String(i+1).padStart(2,'0')}</span>`));}
 const career=posts.find(p=>p.icon==='Compass');assert.equal(career.cta_config.button_link,'/student/my-pathway');assert(career.bullets.some(t=>t.includes('Student’s dream')));assert(career.bullets.some(t=>t.includes('Parent’s dream')));assert(career.bullets.some(t=>t.includes('Kenyan reality')));
 const sources=await readFile(new URL('../../backend/src/analytics/landing-source.ts',import.meta.url),'utf8');assert(sources.includes(`blog/${career.slug}`));
 const sitemap=await readFile(join(root,'sitemap.xml'),'utf8');assert(sitemap.includes(`/blog/${career.slug}/`));assert(sitemap.includes('/guides/csl-project-planner/'));
});
test('every article has real responsive artwork and a matching social preview',async()=>{
 for(const post of posts){
  const html=article(post),art=post.artwork;
  assert(art.alt.length>30);assert(html.includes(`src="${art.src}"`));assert(html.includes(`srcset="${art.srcset}"`));
  assert(html.includes(`property="og:image" content="https://assignmenthub.co.ke${art.share}"`));
  const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);assert.equal(schema.image,`https://assignmenthub.co.ke${art.share}`);
  for(const file of [art.src,art.share,...art.srcset.split(', ').map(v=>v.split(' ')[0])]){const bytes=await readFile(new URL('../public'+file,import.meta.url));assert(bytes.length>1000);assert(bytes.length<400000,`Optimised image budget: ${file}`);}
 }
});
