// Authoring command, not a production-build dependency.
// NODE_PATH=<playwright installation> AUTH_CHROMIUM_EXECUTABLE=<chromium> node scripts/render-blog-diagrams.cjs
const {chromium}=require('playwright');
const {readFile,readdir,writeFile}=require('node:fs/promises');
const {resolve}=require('node:path');
const {createHash}=require('node:crypto');
const hash=data=>createHash('sha256').update(data).digest('hex');
(async()=>{
 const root=resolve(__dirname,'../public/blog/diagrams'),manifest={};
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.AUTH_CHROMIUM_EXECUTABLE?{executablePath:process.env.AUTH_CHROMIUM_EXECUTABLE}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:800},deviceScaleFactor:1});
  for(const file of (await readdir(root)).filter(f=>f.endsWith('.svg')).sort()){
   const svg=await readFile(resolve(root,file),'utf8'),share=file.replace('.svg','-share.jpg');
   await page.setContent(`<html><head><style>html,body{margin:0}svg{display:block;width:1200px;height:800px}</style></head><body>${svg}</body></html>`);
   await page.screenshot({path:resolve(root,share),type:'jpeg',quality:86});
   manifest[file]={source:hash(svg),share,shareHash:hash(await readFile(resolve(root,share)))};
  }
  await writeFile(resolve(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log('Rendered matching JPEG sharing diagrams and provenance hashes.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
