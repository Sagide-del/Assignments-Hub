import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {article,generateBlog,posts} from './generate-public-blog.mjs';
import {countWords} from '../content/research-guides.mjs';
import {anchorHeadings,plainText,richText} from './render-deep-guide.mjs';
const copy=html=>html.match(/<div data-article-copy>([\s\S]*?)<\/div><section class="related-guides">/)[1];
test('every existing guide follows the global depth structure and 800–1,200-word range',()=>{
 assert.equal(posts.length,7);
 for(const post of posts){
  const html=article(post),words=countWords(plainText(copy(html)));assert(words>=800&&words<=1200,`${post.slug}: ${words}`);
  assert.equal(post.takeaways.length,3);assert(post.sections.length>=4);assert(post.faqs.length>=3&&post.faqs.length<=5);
  assert(html.indexOf('class="brand-introduction"')<html.indexOf('<h1>'));assert(html.includes('href="/about/">Learn More'));
  assert(html.includes('class="article-toc"'));assert.equal((html.match(/class="research-insight"/g)||[]).length,1);assert(html.includes('data-lucide="Lightbulb"'));
  assert.equal((html.match(/data-topic-cta=/g)||[]).length,1);assert(html.includes('How This Connects to Your Child’s Career'));
  assert.equal((html.match(/class="related-guide-card"/g)||[]).length,4);assert.equal(new Set(post.related).size,4);assert(!post.related.includes(post.slug));
  const content=copy(html);assert(content.indexOf('class="key-takeaways"')<content.indexOf('class="quick-answer"'));assert(content.indexOf('class="quick-answer"')<content.indexOf('class="research-insight"'));assert(content.indexOf('class="guide-faq"')<content.indexOf('class="career-pathway"'));assert(content.indexOf('class="career-pathway"')<content.indexOf('data-topic-cta='));
  const headings=[...html.matchAll(/<h([23])[^>]*\bid="([^"]+)"/g)].map(m=>m[2]);assert.equal(headings.length,new Set(headings).size);
  const toc=html.match(/<nav class="article-toc"[\s\S]*?<\/nav>/)[0];for(const id of headings)assert(toc.includes(`href="#${id}"`),id);
  for(const source of post.research.sources){assert(html.includes(source.url));assert(html.includes(source.label.replaceAll('&','&amp;')));}
  const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
  const faq=schemas.find(s=>s['@type']==='FAQPage');assert.equal(faq.mainEntity.length,post.faqs.length);for(const [i,item] of post.faqs.entries()){assert.equal(faq.mainEntity[i].name,item.question);assert.equal(faq.mainEntity[i].acceptedAnswer.text,item.answer);assert(html.includes(item.question.replaceAll('&','&amp;')));}
 }
});
test('custom explanatory diagrams and sharing images replace staged covers',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../public/blog/diagrams/manifest.json',import.meta.url),'utf8'));
 for(const post of posts){
  const html=article(post),art=post.artwork;assert.equal(art.type,'diagram');assert(art.src.endsWith('.svg'));assert(art.alt.length>30);assert(html.includes(`src="${art.src}"`));assert(!html.includes('/blog/artwork/'));
  const svg=await readFile(new URL('../public'+art.src,import.meta.url),'utf8');const record=manifest[art.src.split('/').at(-1)];assert(record);assert.equal(createHash('sha256').update(svg).digest('hex'),record.source,'Re-export sharing image after changing its source diagram');assert.equal(createHash('sha256').update(await readFile(new URL('../public'+art.share,import.meta.url))).digest('hex'),record.shareHash);assert(svg.includes('<title'));assert(svg.includes('<desc'));assert(!/<script|foreignObject|https?:\/\//.test(svg.replace('http://www.w3.org/2000/svg','')));
  for(const file of [art.src,art.share]){const bytes=await readFile(new URL('../public'+file,import.meta.url));assert(bytes.length>1000&&bytes.length<400000);}
  assert(html.includes(`property="og:image" content="https://assignmenthub.co.ke${art.share}"`));
 }
 const svg=await readFile(new URL('../public/blog/diagrams/fraction-bars.svg',import.meta.url),'utf8');
 const shadedWidths=[360,490,620].map(y=>[...svg.matchAll(new RegExp(`<rect x="[^\"]+" y="${y}" width="([^\"]+)" height="75" fill="#c5f235"`,'g'))].reduce((sum,m)=>sum+Number(m[1]),0));assert.deepEqual(shadedWidths,[500,500,500]);
});
test('TOC handles duplicate headings and internal editorial links fail closed',()=>{
 const anchored=anchorHeadings('<h2>Plan &amp; review</h2><h3>Plan &amp; review</h3>');assert.deepEqual(anchored.headings.map(h=>h.id),['plan-review','plan-review-2']);
 const options={escape:v=>v.replaceAll('<','&lt;'),validPaths:new Set(['/blog/example/'])};assert(richText('Read [[the guide|/blog/example/]].',options).includes('href="/blog/example/"'));
 assert.throws(()=>richText('[[Bad|javascript:alert(1)]]',options));assert.throws(()=>richText('[[Unknown|/blog/missing/]]',options));
});
test('global publishing keeps canonical URLs, four valid related cards and a stable sitemap',async()=>{
 const root=await mkdtemp(join(tmpdir(),'depth-blog-'));await writeFile(join(root,'sitemap.xml'),'<urlset></urlset>');await generateBlog(root);const first=await readFile(join(root,'sitemap.xml'),'utf8');await generateBlog(root);assert.equal(await readFile(join(root,'sitemap.xml'),'utf8'),first);
 for(const post of posts){assert(first.includes(`/blog/${post.slug}/`));const html=await readFile(join(root,'blog',post.slug,'index.html'),'utf8');assert(html.includes(`rel="canonical" href="https://assignmenthub.co.ke/blog/${post.slug}/"`));for(const slug of post.related)assert(posts.some(p=>p.slug===slug));if(post.metaTitle){assert(post.metaTitle.length<60);assert(post.description.length<=160);}}
 const catalogue=JSON.parse(await readFile(new URL('../../backend/src/career/data/owner-supplied-combinations-20261113.json',import.meta.url),'utf8'));const career=article(posts.find(p=>p.slug==='career-compass-kenyan-students'));for(const code of ['ST2056','SS1040']){const combination=catalogue.find(c=>c.code===code);assert(combination);assert(career.includes(code));for(const subject of combination.subjects)assert(career.includes(subject));}
});
