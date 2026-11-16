import {readdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {renderPopularGuides} from './popular-guides.mjs';
export function decoratePublicFooter(html){
 if(!html.includes('</footer>'))return html;
 const clean=html.replace(/<!-- popular-guides:start -->[\s\S]*?<!-- popular-guides:end -->/g,'');
 return clean.replace('</footer>',`${renderPopularGuides()}</footer>`);
}
async function visit(dir){
 for(const item of await readdir(dir,{withFileTypes:true})){
  const path=dir+'/'+item.name;
  if(item.isDirectory())await visit(path);
  else if(item.name.endsWith('.html')){
   const original=await readFile(path,'utf8'),html=decoratePublicFooter(original);
   if(html!==original)await writeFile(path,html);
  }
 }
}
if(process.argv[1]===fileURLToPath(import.meta.url))await visit(fileURLToPath(new URL('../public',import.meta.url)));
