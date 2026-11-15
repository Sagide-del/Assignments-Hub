import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,readFile,writeFile,mkdir} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import ts from 'typescript';
import {generateBlog,posts} from './generate-public-blog.mjs';import {captureLandingSource} from '../public/revision/assets/landing-source.mjs';import {cslProjects} from '../content/blog-upgrades.mjs';import {grade9Math,grade7English} from '../content/seo-practice.mjs';
test('articles have topic-specific CTAs, practical content, real previews and stable sitemaps',async()=>{
 const root=await mkdtemp(join(tmpdir(),'seo-conversion-'));await writeFile(join(root,'sitemap.xml'),'<urlset></urlset>');await generateBlog(root);
 assert.equal(new Set(posts.map(p=>p.cta_config.button_link)).size,6);
 for(const p of posts){const h=await readFile(join(root,'blog',p.slug,'index.html'),'utf8');assert.ok(h.includes(`href="${p.cta_config.button_link}"`));assert.ok(h.includes('Key takeaways'));assert.ok(h.includes('mobile-topic-cta'));assert.ok(h.includes('data-blog-source="blog/'+p.slug+'"'));}
 const csl=await readFile(join(root,'blog/csl-ideas-for-students/index.html'),'utf8');assert.equal((csl.match(/class="quick-answer csl-project"/g)||[]).length,10);for(const item of cslProjects)for(const text of item)assert.ok(csl.includes(text));
 const maths=await readFile(join(root,'blog/core-vs-essential-mathematics/index.html'),'utf8');assert.ok(maths.includes('<table>'));assert.ok(maths.includes('7√2'));assert.ok(maths.includes('KES 800'));assert.ok(!maths.includes('Lower (Business'));
 const kjsea=await readFile(join(root,'blog/kjsea-past-papers-and-mocks/index.html'),'utf8');assert.equal((kjsea.match(/class="quick-answer sample-question"/g)||[]).length,5);assert.ok(kjsea.includes('not an official KNEC paper'));
 for(const kind of ['sports','music']){const h=await readFile(join(root,'labs',kind,'preview/index.html'),'utf8');assert.ok(h.includes('static screenshot'));assert.ok(h.includes('Sign in to interact'));assert.ok(h.includes('/product-previews/'));}
 const first=await readFile(join(root,'sitemap.xml'),'utf8');await generateBlog(root);assert.equal(await readFile(join(root,'sitemap.xml'),'utf8'),first);
});
test('first touch is kept, tracking respects privacy and cookies contain no form values or queries',()=>{
 const names=['navigator','document','location'];const saved=names.map(k=>Object.getOwnPropertyDescriptor(globalThis,k));let cookie='',preference='0';
 try{Object.defineProperty(globalThis,'navigator',{configurable:true,value:{get doNotTrack(){return preference}}});Object.defineProperty(globalThis,'location',{configurable:true,value:{protocol:'https:',search:'?phone=0712345678'}});const doc={body:{dataset:{blogSource:'blog/csl-ideas-for-students'}}};Object.defineProperty(doc,'cookie',{get:()=>cookie,set:v=>cookie=v});Object.defineProperty(globalThis,'document',{configurable:true,value:doc});captureLandingSource();assert.match(cookie,/Max-Age=2592000/);assert.match(cookie,/Secure/);assert.ok(!cookie.includes('0712345678'));const first=cookie;doc.body.dataset.blogSource='blog/core-vs-essential-mathematics';captureLandingSource();assert.equal(cookie,first);preference='1';captureLandingSource();assert.match(cookie,/Max-Age=0/);}finally{names.forEach((k,i)=>saved[i]?Object.defineProperty(globalThis,k,saved[i]):delete globalThis[k]);}
});
test('new samples are complete and post-login destinations cannot become open redirects',async()=>{
 for(const t of [grade9Math,grade7English]){assert.equal(t.questions.length,5);for(const q of t.questions){assert.equal(q.options.length,4);assert.ok(q.answer>=0&&q.answer<4);assert.ok(q.explanation.length>40);}}
 assert.equal(540/3*5,900);assert.equal(3*(2*4-1),21);assert.equal(Math.sqrt(6**2+8**2),10);assert.equal(22/7*7*7*10,1540);
 const source=await readFile(new URL('../src/utils/product-return.ts',import.meta.url),'utf8');const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,e={};new Function('exports',compiled)(e);
 assert.equal(e.productReturnPath('/student/csl','STUDENT'),'/student/csl');for(const path of ['https://evil.test','//evil.test','/platform/cms','/student/csl?next=evil'])assert.equal(e.productReturnPath(path,'STUDENT'),undefined);assert.equal(e.productReturnPath('/student/csl','TEACHER'),undefined);
});

test('KJSEA article uses only validated approved public samples when supplied',async()=>{
 const root=await mkdtemp(join(tmpdir(),'seo-reviewed-'));await mkdir(join(root,'revision'));await writeFile(join(root,'sitemap.xml'),'<urlset></urlset>');
 const sample={...grade9Math,source:'approved-public-question-bank',questions:grade9Math.questions.map((q,i)=>({...q,prompt:i===0?'A reviewed public sample: '+q.prompt:q.prompt}))};
 await writeFile(join(root,'revision/grade9-blog-samples.json'),JSON.stringify(sample));await generateBlog(root);
 const html=await readFile(join(root,'blog/kjsea-past-papers-and-mocks/index.html'),'utf8');assert.ok(html.includes('A reviewed public sample:'));assert.ok(html.includes('reviewed public'));
 await writeFile(join(root,'revision/grade9-blog-samples.json'),JSON.stringify({...sample,questions:[]}));await assert.rejects(generateBlog(root));
});
