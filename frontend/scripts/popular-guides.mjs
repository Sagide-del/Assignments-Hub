import {readFileSync} from 'node:fs';
export const popularGuides=JSON.parse(readFileSync(new URL('../content/popular-guides.json',import.meta.url),'utf8'));
export const renderPopularGuides=()=>`<!-- popular-guides:start --><nav aria-label="Popular Guides" style="max-width:1156px;margin:auto;padding:20px 24px"><strong>Popular Guides</strong><ul style="display:flex;flex-wrap:wrap;gap:12px 24px;list-style:none;padding:0">${popularGuides.map(g=>`<li><a style="color:inherit" href="${g.href}">${g.label}</a></li>`).join('')}</ul></nav><!-- popular-guides:end -->`;
