export function paragraphChunks(text){const sentences=[...new Intl.Segmenter('en',{granularity:'sentence'}).segment(text)].map(item=>item.segment.trim()).filter(Boolean);return Array.from({length:Math.ceil(sentences.length/2)},(_,i)=>sentences.slice(i*2,i*2+2).join(' '));}
export const plainText=html=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
export function richText(text,{escape:e,validPaths}){
 return String(text).split(/(\[\[[^\]]+\]\])/g).map(part=>{
  if(!part.startsWith('[['))return e(part);
  const [label,path]=part.slice(2,-2).split('|');if(!label||!validPaths.has(path))throw Error('Invalid editorial internal link: '+part);
  return `<a href="${e(path)}">${e(label)}</a>`;
 }).join('');
}
export function anchorHeadings(html,used=new Set()){
 const headings=[];
 const result=html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/g,(_,level,attributes,inner)=>{
  const text=plainText(inner).trim(),existing=attributes.match(/\bid="([^"]+)"/),base=existing?.[1]??text.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  let id=base||'section',n=2;while(used.has(id))id=`${base}-${n++}`;used.add(id);headings.push({level:Number(level),text,id});
  return `<h${level}${attributes.replace(/\s*id="[^"]*"/,'')} id="${id}">${inner}</h${level}>`;
 });return {html:result,headings};
}
export function renderToc(headings,e){return `<nav class="article-toc" aria-label="Table of contents"><details><summary>In this guide · ${headings.length} sections</summary><ol>${headings.map(h=>`<li class="toc-level-${h.level}"><a href="#${h.id}">${e(h.text)}</a></li>`).join('')}</ol></details></nav>`;}
export function renderDeepCopy(post,{escape:e,iconSvg,researchBox,topicCta,validPaths}){
 const rich=t=>richText(t,{escape:e,validPaths});const paras=items=>(items??[]).flatMap(paragraphChunks).map(t=>`<p>${rich(t)}</p>`).join('');
 const sections=post.sections.map(section=>{
  const table=section.table?`<div class="comparison-scroll"><table><caption>${e(section.table.caption)}</caption><thead><tr>${section.table.headers.map(h=>`<th scope="col">${e(h)}</th>`).join('')}</tr></thead><tbody>${section.table.rows.map(row=>`<tr>${row.map(cell=>`<td>${rich(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:'';
  const list=section.bullets?`<ul>${section.bullets.map(t=>`<li>${rich(t)}</li>`).join('')}</ul>`:'';
  const steps=section.steps?`<ol class="practical-checklist">${section.steps.map(t=>`<li>${rich(t)}</li>`).join('')}</ol>`:'';
  const examples=section.examples?`<div class="csl-examples"><h3>Ten CSL project ideas</h3><ol>${section.examples.map(t=>`<li>${e(t)}</li>`).join('')}</ol><a href="/guides/csl-project-planner/">Ten-project CSL planner</a></div>`:'';
  const layers=section.layers?`<div class="career-layer-grid">${section.layers.map((layer,i)=>`<section class="career-layer-card"><div class="career-layer-icon">${iconSvg(layer.icon)}<span>0${i+1}</span></div><h3>${e(layer.title)}</h3>${paras(layer.paragraphs)}</section>`).join('')}</div>`:'';
  const checklist=section.checklist?`<div class="career-checklist"><ol>${section.checklist.map((t,i)=>`<li><label for="career-step-${i+1}"><input id="career-step-${i+1}" type="checkbox" name="career-step" value="${i+1}"><span>${e(t)}</span></label></li>`).join('')}</ol><div class="career-checklist-tools"><output id="career-checklist-progress" aria-live="polite" hidden></output><button type="button" id="career-checklist-reset" hidden>Reset checklist</button></div></div>`:'';
  const subs=section.subsections?.map(sub=>`<section><h3>${e(sub.heading)}</h3>${paras(sub.paragraphs)}</section>`).join('')??'';
  return `<section class="guide-chunk${section.layers?' career-layers':''}"><h2>${e(section.heading)}</h2>${paras(section.paragraphs)}${layers}${table}${list}${steps}${examples}${checklist}${subs}</section>`;
 }).join('');
 const resourceLinks=(post.resources??post.links??[]).filter(link=>!sections.includes(`href="${e(link.href)}"`));for(const link of resourceLinks)if(!link.href.startsWith('https://')&&!validPaths.has(link.href))throw Error('Invalid guide resource: '+link.href);
 const resources=resourceLinks.length?`<section class="guide-resources"><h2>Sources and practical resources</h2><ul>${resourceLinks.map(link=>`<li><a href="${e(link.href)}" rel="noopener">${e(link.text)}</a></li>`).join('')}</ul></section>`:'';
 return `<section class="key-takeaways"><h2>Key takeaways</h2><ul>${post.takeaways.map(t=>`<li>${e(t)}</li>`).join('')}</ul></section><section class="quick-answer"><h2>The short answer</h2><p>${e(post.answer)}</p></section>${researchBox(post)}${sections}${resources}<section class="guide-faq" aria-labelledby="faq-title"><h2 id="faq-title">Questions parents ask</h2>${post.faqs.map(faq=>`<details><summary>${e(faq.question)}</summary><p>${e(faq.answer)}</p></details>`).join('')}</section><section class="career-pathway"><h2>How This Connects to Your Child’s Career</h2><p>${e(post.career)}</p><a class="text-link" href="${post.slug==='career-compass-kenyan-students'?'/student/career':'/blog/career-compass-kenyan-students/'}">${post.slug==='career-compass-kenyan-students'?'Open Career Compass':'Read the Career Compass guide'}</a></section>${topicCta(post)}`;
}
export function renderRelated(post,posts,e){
 return `<section class="related-guides"><h2>Related guides</h2><div class="related-guides-grid">${post.related.map(slug=>{const related=posts.find(p=>p.slug===slug);if(!related)throw Error('Unknown related guide: '+slug);return `<a class="related-guide-card" href="/blog/${slug}/"><img src="${related.artwork.src}" width="1536" height="1024" alt="${e(related.artwork.alt)}" loading="lazy" decoding="async"><h3>${e(related.title)}</h3><span>Read the guide →</span></a>`;}).join('')}</div></section>`;
}
