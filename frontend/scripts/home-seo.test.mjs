import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const content=JSON.parse(await readFile(new URL('../src/content/homepage.json',import.meta.url),'utf8'));
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
test('homepage initial HTML exposes requested SEO metadata and canonical',()=>{
 assert(html.includes(`<title>${content.title.replaceAll('&','&amp;')}</title>`));
 assert(html.includes(`name="description" content="${content.description}"`));
 assert(html.includes('rel="canonical" href="https://assignmenthub.co.ke/"'));
});
test('software and FAQ structured data stay in sync with visible question content',()=>{
 const graph=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
 const app=graph.find(x=>x['@type']==='SoftwareApplication');assert.equal(app.name,'Assignment Hub');assert.equal(app.countryOfOrigin.identifier,'KE');
 const faq=graph.find(x=>x['@type']==='FAQPage');assert.equal(faq.mainEntity.length,content.faqs.length);
 assert.deepEqual(faq.mainEntity.map(x=>[x.name,x.acceptedAnswer.text]),content.faqs.map(x=>[x.question,x.answer]));
 assert(content.faqs.some(f=>f.answer.includes('not official KNEC')));
});
test('free practice alias has a fixed destination and a non-JavaScript fallback',async()=>{
 const alias=await readFile(new URL('../public/free-revision/index.html',import.meta.url),'utf8');
 assert(alias.includes('href="/revision/"'));assert(alias.includes('content="0;url=/revision/"'));
 assert(alias.includes('rel="canonical" href="https://assignmenthub.co.ke/revision/"'));
});

test('homepage FAQ schema is removed on other views and restored on return',async()=>{
 const script={textContent:html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]};
 const previous=globalThis.document;
 globalThis.document={querySelector:()=>script};
 try{
  const {loadTypeScript}=await import('./load-typescript.mjs');
  const {showHomepageFaq}=await loadTypeScript(new URL('../src/utils/homepage-schema.ts',import.meta.url));
  showHomepageFaq(false);
  assert.equal(JSON.parse(script.textContent)['@graph'].some(x=>x['@type']==='FAQPage'),false);
  assert.equal(JSON.parse(script.textContent)['@graph'][0]['@type'],'SoftwareApplication');
  showHomepageFaq(true);
  assert.equal(JSON.parse(script.textContent)['@graph'].find(x=>x['@type']==='FAQPage').mainEntity.length,content.faqs.length);
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('organisation identity and lung social preview use the supplied business details',()=>{
 const graph=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
 const org=graph.find(x=>x['@type']==='EducationalOrganization');
 assert.equal(org.address.postOfficeBoxNumber,'14069');assert.equal(org.address.postalCode,'00100');assert.equal(org.address.addressLocality,'Nairobi');
 assert.equal(org.contactPoint.telephone,'+254748519923');assert.equal(org.sameAs.length,2);assert(org.sameAs.every(url=>url.startsWith('https://')&&!url.includes('](')));
 assert(html.includes('property="og:image" content="https://assignmenthub.co.ke/product-previews/respiratory.webp"'));
});
