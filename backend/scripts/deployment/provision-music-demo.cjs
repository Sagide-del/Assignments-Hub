#!/usr/bin/env node
// Explicit synthetic learner only. Never invoked by application startup.
const {createRequire}=require('node:module');
const {resolve}=require('node:path');
const {randomInt}=require('node:crypto');
const SCHOOL_CODE='MUSICDEMO';
const ADMISSION='MUSIC1001';
const local=()=>createRequire(resolve('package.json'));
async function provisionMusicDemo(db) {
 const pin=String(randomInt(100000,1000000));
 const passwordHash=await local()('bcrypt').hash(pin,12);
 const expiresAt=new Date(Date.now()+14*24*60*60*1000);
 const result=await db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('assignmenthub-music-demo'))::text`;
  if(await tx.school.findUnique({where:{code:SCHOOL_CODE}}))throw Error('MUSICDEMO already exists. No users or PINs were changed; use the PIN from the first setup.');
  const pathway=await tx.pathway.findFirst({where:{name:{in:['Arts & Sports','Arts & Sports Science','Arts and Sports Science'],mode:'insensitive'}}});
  if(!pathway)throw Error('The Arts pathway is missing. No changes made; no curriculum seed was run.');
  let track=await tx.track.findFirst({where:{pathwayId:pathway.id,name:{in:['Performing Arts','Music'],mode:'insensitive'}},orderBy:{isPublished:'desc'}});
  if(!track)track=await tx.track.create({data:{pathwayId:pathway.id,key:'music-demo-performing-arts',name:'Performing Arts',description:'Unpublished reference for the synthetic Music Studio demo learner only.',icon:'music',isPublished:false,requiredSubjects:[],careers:[],skills:[],universitiesKenya:[],universitiesIntl:[]}});
  const school=await tx.school.create({data:{name:'Assignment Hub Music Demo',code:SCHOOL_CODE,subscriptionStatus:'ACTIVE'}});
  await tx.stream.create({data:{school_id:school.id,name:'10M',grade:'Grade 10'}});
  const student=await tx.user.create({data:{schoolId:school.id,name:'Music Demo Learner',role:'STUDENT',grade:'Grade 10',admissionNumber:ADMISSION,passwordHash,subscriptionExpiresAt:expiresAt,elective_subjects:['Computer Studies','Fine Arts','Music & Dance'],studentProfile:{create:{admissionNumber:ADMISSION,grade:'Grade 10',stream:'10M',pathway:pathway.name}}}});
  await tx.studentPathwaySelection.create({data:{schoolId:school.id,studentId:student.id,trackId:track.id,source:'MANUAL',notes:'Synthetic Music Studio demonstration account; not an official placement.'}});
  return {schoolId:school.id,studentId:student.id,pathway:pathway.name,track:track.name};
 },{timeout:30000});
 return {schoolCode:SCHOOL_CODE,admissionNumber:ADMISSION,pin,grade:'Grade 10',expiresAt:expiresAt.toISOString(),...result};
}
async function verifyMusicDemo(c,base='https://assignments-hub-api.onrender.com/api/v1') {
 const response=await fetch(base+'/auth/student/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({schoolCode:c.schoolCode,admissionNumber:c.admissionNumber,pin:c.pin}),signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error(`Demo login verification failed (HTTP ${response.status}). Keep the generated PIN above.`);
 const auth=await response.json();
 if(auth.user?.role!=='STUDENT'||!auth.accessToken||auth.user.id!==c.studentId)throw Error('Unexpected demo login identity.');
 const headers={Authorization:`Bearer ${auth.accessToken}`};
 const r=await fetch(base+'/student/lab-config',{headers,signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error(`Lab config verification failed (HTTP ${r.status}).`);
 const config=await r.json();if(config.category!=='ARTS_MUSIC'||config.route!=='/student/labs/music')throw Error('The demo is not scoped to Music Studio.');
 const projects=await fetch(base+'/student/music-studio/projects',{headers,signal:AbortSignal.timeout(20000)});
 if(!projects.ok)throw Error(`Project access verification failed (HTTP ${projects.status}).`);
 return true;
}
async function main(){
 if(!process.env.DATABASE_URL)throw Error('Run from the backend directory in Render Shell. Do not share DATABASE_URL.');
 const {PrismaClient}=local()('@prisma/client');const db=new PrismaClient();
 try{
  if(!process.argv.includes('--apply')){console.log(JSON.stringify({mode:'DRY RUN — no writes',schoolCode:SCHOOL_CODE,admissionNumber:ADMISSION,grade:'Grade 10',pathway:'Arts',track:'Performing Arts',existingSchool:!!await db.school.findUnique({where:{code:SCHOOL_CODE}}),instruction:'Add --apply to provision this isolated demo.'},null,2));return;}
  const credentials=await provisionMusicDemo(db);
  console.log('\nSAVE THESE DEMO LOGINS — the generated PIN is not stored in plain text.\n');
  console.log(JSON.stringify({loginUrl:'https://assignmenthub.co.ke/login?account=school',loginTab:'School student',studioUrl:'https://assignmenthub.co.ke/student/labs/music',...credentials},null,2));
  await verifyMusicDemo(credentials);
  console.log('\nVERIFIED: demo login, Music Studio scope and project access. Sign in using School student.\n');
 }finally{await db.$disconnect();}
}
module.exports={provisionMusicDemo,verifyMusicDemo};
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
