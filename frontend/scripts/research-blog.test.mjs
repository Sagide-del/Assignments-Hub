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
 assert.equal(posts.length,11);
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

test('all eleven guides link to public practice, working product routes and official resources',()=>{
 for(const post of posts){const html=article(post),content=copy(html);
  for(const path of ['/revision/','/student/coach','/student/career'])assert(content.includes(`href="${path}"`),post.slug+' missing '+path);
  assert((content.match(/href="\/blog\//g)||[]).length>=2,post.slug+' contextual links');
  const official=[...new Set([...content.matchAll(/href="(https:\/\/[^\"]+)"/g)].map(m=>m[1]).filter(url=>['www.knec.ac.ke','kicd.ac.ke','www.education.go.ke','selection-placement.kemis.go.ke'].includes(new URL(url).hostname)))];assert(official.length>=2,post.slug);
  for(const slug of ['cbc-grading-levels-explained','kjsea-past-papers-and-mocks','csl-ideas-for-students','senior-school-pathways-cbc','career-path-selection-guide'])assert(html.match(/<footer[\s\S]*?<\/footer>/)[0].includes(`/blog/${slug}/`));
  assert(!/retention by (50|80)%|understanding by 30%|strongest predictor|Grinberg \(2015\)/i.test(plainText(content)));
 }
});
test('practical additions include every project field, worked answers and the practice grading rubric',()=>{
 const get=slug=>article(posts.find(p=>p.slug===slug));
 const csl=get('csl-ideas-for-students');assert.equal((csl.match(/class="csl-project"/g)||[]).length,10);for(const label of ['Materials','Budget (KES)','Supervision','Evidence','Example reflection'])assert.equal(csl.split(`<strong>${label}</strong>`).length-1,10);
 const kj=get('kjsea-past-papers-and-mocks');assert.equal((kj.match(/Show worked answer/g)||[]).length,5);for(const answer of ['KES 900','x = 4','10 cm','1,540 cm³','1/5'])assert(kj.includes(answer));
 const grading=get('cbc-grading-levels-explained');for(const band of ['EE1','EE2','ME1','ME2','AE1','AE2','BE1','BE2'])assert(grading.includes(`<td>${band}</td>`));assert(grading.includes('not a real pupil'));assert(grading.includes('not a universal official'));
});
test('product evidence uses optimized authentic screenshots with descriptive alt text and provenance',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../public/blog/product/manifest.json',import.meta.url),'utf8'));
 let count=0;
 for(const post of posts)for(const section of post.sections){const shot=section.screenshot;if(!shot)continue;count++;assert(shot.src.startsWith('/blog/product/'));assert(shot.alt.length>50);assert(shot.caption.length>30);const bytes=await readFile(new URL('../public'+shot.src,import.meta.url));assert(bytes.length<250000);const record=manifest[shot.src.split('/').at(-1)];assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256);assert.equal(shot.height,record.height);assert.equal(shot.width,record.width);assert(article(post).includes(shot.src));}
 assert.equal(count,3);
});

test('public footer injection is idempotent and leaves pages without footers untouched',async()=>{
 const {decoratePublicFooter}=await import('./generate-popular-footers.mjs');
 const original='<main>Content</main><footer><p>Existing footer</p></footer>';
 const first=decoratePublicFooter(original);assert.equal(decoratePublicFooter(first),first);assert.equal((first.match(/aria-label="Popular Guides"/g)||[]).length,1);assert(first.includes('<p>Existing footer</p>'));assert.equal(decoratePublicFooter('<main>No footer</main>'),'<main>No footer</main>');
});
