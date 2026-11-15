export function renderCareerGuide(post,{escape:e,iconSvg,researchBox,topicCta}){
 const paragraphs=items=>items.map(text=>`<p>${e(text)}</p>`).join('');
 return `<section class="key-takeaways"><h2>Key takeaways</h2><ul>${post.takeaways.map(text=>`<li>${e(text)}</li>`).join('')}</ul></section>
 <section class="quick-answer"><h2>The short answer</h2><p>${e(post.answer)}</p></section>
 ${researchBox(post)}
 <section class="career-layers" aria-labelledby="career-layers-title"><h2 id="career-layers-title">The three layers of Career Compass</h2><div class="career-layer-grid">${post.layers.map((layer,i)=>`<section class="career-layer-card"><div class="career-layer-icon">${iconSvg(layer.icon)}<span>0${i+1}</span></div><h3>${e(layer.title)}</h3>${paragraphs(layer.paragraphs)}</section>`).join('')}</div></section>
 <section class="career-combinations"><h2>${e(post.combinations.title)}</h2>${paragraphs(post.combinations.paragraphs)}<p class="career-source-links"><a href="https://selection-placement.kemis.go.ke/pathways">MoE pathway portal</a> · <a href="https://www.knbs.or.ke/">KNBS employment statistics</a></p></section>
 <section class="career-checklist" aria-labelledby="career-checklist-title"><h2 id="career-checklist-title">${iconSvg('CheckCircle')} How to choose without guessing</h2><p>Check each step as a family; use the list to guide a conversation, not to score your child.</p><ol>${post.checklist.map((text,i)=>`<li><label for="career-step-${i+1}"><input id="career-step-${i+1}" type="checkbox" name="career-step" value="${i+1}"><span>${e(text)}</span></label></li>`).join('')}</ol><div class="career-checklist-tools"><output id="career-checklist-progress" aria-live="polite" hidden></output><button type="button" id="career-checklist-reset" hidden>Reset checklist</button></div></section>
 <section class="career-pathway"><h2>How This Connects to Your Child’s Career</h2><p>${e(post.career)}</p></section>${topicCta(post)}`;
}
