import {readFile,writeFile} from 'node:fs/promises';
const data=JSON.parse(await readFile(new URL('../src/content/homepage.json',import.meta.url),'utf8'));
const file=new URL('../index.html',import.meta.url);
const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const graph={'@context':'https://schema.org','@graph':[
 {'@type':'SoftwareApplication','@id':'https://assignmenthub.co.ke/#application',name:'Assignment Hub',url:'https://assignmenthub.co.ke/',applicationCategory:'EducationalApplication',operatingSystem:'Web browser',countryOfOrigin:{'@type':'Country',name:'Kenya',identifier:'KE'},description:data.description},
 {'@type':'FAQPage','@id':'https://assignmenthub.co.ke/#faq',mainEntity:data.faqs.map(f=>({'@type':'Question',name:f.question,acceptedAnswer:{'@type':'Answer',text:f.answer}}))}
]};
let html=await readFile(file,'utf8');
html=html.replace(/<title>[\s\S]*?<\/title>/,`<title>${escape(data.title)}</title>`).replace(/<meta name="description" content="[^"]*"\s*\/>/,`<meta name="description" content="${escape(data.description)}" />`);
for(const [key,value] of [['og:title',data.title],['og:description',data.description],['twitter:title',data.title],['twitter:description',data.description]])html=html.replace(new RegExp(`<meta (?:property|name)="${key}" content="[^"]*"\\s*/>`),`<meta ${key.startsWith('og:')?'property':'name'}="${key}" content="${escape(value)}" />`);
html=html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,`<script type="application/ld+json">${JSON.stringify(graph).replaceAll('<','\\u003c')}</script>`);
await writeFile(file,html);
console.log('Homepage metadata and visible FAQ schema synchronized.');
