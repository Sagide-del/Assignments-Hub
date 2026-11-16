import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../public/blog/diagrams/',import.meta.url));
const ink='#17352e',lime='#c5f235',muted='#5b7066',paper='#fbfaf6';
const e=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=(x,y,value,size=34,color=ink,weight=500)=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}">${e(value)}</text>`;
const lines=(x,y,items,size=30,color=muted)=>items.map((v,i)=>text(x,y+i*(size+15),v,size,color)).join('');
const box=(x,y,w,h,fill='#fff',stroke='#d6dfd2')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="26" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
const arrow=(x1,y1,x2,y2)=>`<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${ink}" stroke-width="6" fill="none" marker-end="url(#arrow)"/>`;
const frame=(title,subtitle,body,foot)=>`<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024" role="img" aria-labelledby="title desc"><title id="title">${e(title)}</title><desc id="desc">${e(subtitle+' '+foot)}</desc><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 0 L10 5 L0 10Z" fill="${ink}"/></marker></defs><rect width="1536" height="1024" fill="${paper}"/><g font-family="DejaVu Sans,Arial,sans-serif">${text(72,90,'ASSIGNMENT HUB · PARENT FIELD NOTES',24,muted,700)}<rect x="72" y="119" width="90" height="8" rx="4" fill="${lime}"/>${text(72,205,title,60,ink,700)}${text(72,265,subtitle,29,muted)}${body}<path d="M72 907H1464" stroke="#d6dfd2" stroke-width="2"/>${text(72,960,foot,27,muted)}</g></svg>`;
const diagrams={};
diagrams['cbc-grading']=frame('Eight practice bands. One next step.','Assignment Hub mock rubric — not a universal national conversion',
 [['EE1','90–100%'],['EE2','75–<90%'],['ME1','58–<75%'],['ME2','41–<58%'],['AE1','31–<41%'],['AE2','21–<31%'],['BE1','11–<21%'],['BE2','0–<11%']].map(([band,range],i)=>{const x=72+(i%4)*355,y=340+Math.floor(i/4)*240;return box(x,y,325,210)+text(x+25,y+75,band,44,ink,700)+text(x+25,y+145,range,34,muted);}).join(''),
 'Read evidence · locate a gap · practise one skill · review with the teacher.');
diagrams['stem-pathways']=frame('Read the subjects behind STEM','Four areas described in the KICD 2019 framework',
 box(560,325,416,110,ink)+text(653,396,'STEM',58,lime,700)+arrow(768,445,768,495)+
 ['Pure Sciences','Applied Sciences','Technical and','Career and'].map((label,i)=>{const x=72+i*355;return box(x,530,325,285)+text(x+23,594,label,31,ink,700)+lines(x+23,640,[['Explain','Investigate','Interpret'],['Apply','Measure','Solve'],['Engineering','Design · Build','Improve'],['Technology Studies','Practise · Reflect','Develop skills']][i],27);}).join(''),
 'For selection, confirm current MoE combinations and school availability.');
diagrams['revision-cycle']=frame('Attempt. Correct. Return.','An illustrative spaced-practice routine, not a compulsory timetable',
 [{day:'DAY 1',a:'Learn',b:'Use one example'},{day:'DAY 2',a:'Recall',b:'Try without notes'},{day:'DAY 4',a:'Mix',b:'Combine topics'},{day:'DAY 7',a:'Retry',b:'Revisit an error'}].map((item,i)=>{const x=72+i*355;return box(x,370,325,350)+box(x+24,395,277,70,ink)+text(x+55,444,item.day,32,lime,700)+text(x+28,555,item.a,46,ink,700)+text(x+28,622,item.b,25,muted);}).join('')+arrow(130,800,1400,800),
 'Use the first incorrect step to choose the next practice task.');
diagrams['csl-cycle']=frame('Five steps for a useful CSL project','A real community need + safe action + honest reflection',
 ['Need','Approval','Action','Evidence','Reflection'].map((label,i)=>{const x=72+i*282;return box(x,375,258,330)+`<circle cx="${x+64}" cy="440" r="35" fill="${lime}"/>`+text(x+53,452,i+1,30,ink,700)+text(x+24,535,label,32,ink,700)+lines(x+24,590,[['Listen and','define the goal'],['Agree on safe','supervision'],['Do the planned','activity'],['Record your own','contribution'],['Explain what','you would improve']][i],24);}).join(''),
 'Confirm school requirements, consent, evidence and approval before acting.');
diagrams['math-comparison']=frame('Different tasks. Shared reasoning.','Compare actual curriculum designs and intended course requirements',
 box(72,350,675,450)+box(789,350,675,450)+text(106,418,'CORE MATHEMATICS',35,ink,700)+text(823,418,'ESSENTIAL MATHEMATICS',33,ink,700)+lines(106,480,['Depth for STEM study','Illustrative algebraic task'],28)+lines(823,480,['Applied quantitative skills','Illustrative interest calculation'],28)+text(110,640,'√50 + √8 = 7√2',45,ink,700)+text(825,640,'5,000 × 0.08 × 2',39,ink,700)+text(825,705,'= KES 800 interest',37,ink,700),
 'Examples illustrate reasoning; they do not define complete syllabuses.');
const fractionBar=(y,parts,shaded,label)=>text(72,y+46,label,42,ink,700)+Array.from({length:parts},(_,i)=>`<rect x="${420+i*(1000/parts)}" y="${y}" width="${1000/parts}" height="75" fill="${i<shaded?lime:'#fff'}" stroke="${ink}" stroke-width="3"/>`).join('');
diagrams['fraction-bars']=frame('Same whole. Equal value.','One half, two quarters and four eighths represent the same amount',fractionBar(360,2,1,'1/2')+fractionBar(490,4,2,'2/4')+fractionBar(620,8,4,'4/8')+text(420,815,'1/2 + 1/4 = 2/4 + 1/4 = 3/4',42,ink,700),
 'Keep the whole consistent and explain the size of each part.');
diagrams['career-alignment']=frame('A career conversation has three voices','Student interests · family hopes · Kenyan opportunities',
 box(72,355,430,330)+box(553,355,430,330)+box(1034,355,430,330)+
 text(105,425,'STUDENT',35,ink,700)+lines(105,490,['Interests','Work they enjoy','Evidence of progress'],29)+
 text(585,425,'PARENT',35,ink,700)+lines(585,490,['Hopes and concerns','A realistic budget','Available support'],29)+
 text(1066,425,'KENYAN REALITY',32,ink,700)+lines(1066,490,['Actual subjects','Training requirements','Practical opportunities'],27)+
 arrow(290,700,630,780)+arrow(768,700,768,780)+arrow(1245,700,905,780)+box(520,790,500,90,ink)+text(560,847,'DISCUSS · TEST · REVIEW',29,lime,700),
 'Choose two possible routes, one budget and one practical next action.');

diagrams['career-path-selection-flow']=frame('Choose a route. Keep options open.','A practical family decision, reviewed each term',
 ['Interests','Subjects','Costs','Next action'].map((label,i)=>{const x=72+i*355;return box(x,365,325,420)+text(x+25,435,'0'+(i+1),38,ink,700)+text(x+25,510,label,38,ink,700)+lines(x+25,580,[['Show recent work','Listen to the learner','Discuss family hopes'],['Verify combinations','Check prerequisites','Ask the school'],['Include equipment','Travel and living','Compare alternatives'],['Try one project','Get feedback','Review next term']][i],25);}).join(''),
 'A combination code does not guarantee admission, placement or employment.');
diagrams['individualized-study-timetable']=frame('A week built around learning','Illustrative review intervals, not a compulsory schedule',
 ['MON','TUE','THU','SUN'].map((day,i)=>{const x=72+i*355;return box(x,355,325,460)+box(x+20,375,285,75,ink)+text(x+45,425,day,35,lime,700)+lines(x+26,525,[['Learn one idea','Try an example','Take a break'],['Recall without notes','Explain a correction','Protect rest'],['Mix familiar topics','Choose a method','Ask why it fits'],['Retry independently','Review the evidence','Plan the next week']][i],25);}).join(''),
 'Adapt study blocks to school, home responsibilities, sleep and available time.');
diagrams['short-topic-test-cycle']=frame('A test should reveal the next step','Focused practice + feedback + a later independent retry',
 ['Attempt','Correct','Return','Mix'].map((label,i)=>{const x=72+i*355;return box(x,370,325,370)+text(x+25,445,label,41,ink,700)+lines(x+25,520,[['Close the notes','Choose a method','Explain the answer'],['Locate the first error','Write your reasoning','Ask for support'],['Leave a useful gap','Try a new example','Check independence'],['Combine topics','Select the method','Practise pacing']][i],25);}).join(''),
 'Three attempts is a workflow, not a promise of mastery or a universal learning rule.');
diagrams['virtual-labs-overview']=frame('Predict. Investigate. Explain.','Featured workspaces connect interaction with a learning question',
 ['Pure Sciences','Technical','Applied','Sports','Music'].map((label,i)=>{const x=72+i*282;return box(x,370,258,380)+text(x+20,435,label,28,ink,700)+lines(x+20,510,[['Observe a model','Change a variable','Interpret a result'],['Compare settings','Measure effects','Explain constraints'],['Start with a need','Test a response','Record evidence'],['Explore movement','Compare responses','Discuss limits'],['Listen and create','Adjust a rhythm','Explain choices']][i],23);}).join(''),
 'Availability follows curriculum scope; virtual labs complement physical practice.');
await mkdir(root,{recursive:true});
for(const [name,svg] of Object.entries(diagrams))await writeFile(root+name+'.svg',svg);
if(!process.argv.includes('--authoring')){const manifest=JSON.parse(await readFile(root+'manifest.json','utf8'));for(const [name,svg] of Object.entries(diagrams)){if(manifest[name+'.svg']?.source!==createHash('sha256').update(svg).digest('hex'))throw Error(`Sharing artwork for ${name} is stale. Run generate-blog-diagrams.mjs --authoring, then render-blog-diagrams.cjs and commit the exports.`);}}
console.log(`Generated ${Object.keys(diagrams).length} original explanatory SVG diagrams.`);
