/* Explicit synthetic test accounts only. Never invoked by application startup. */
const {createRequire}=require('node:module');
const {resolve}=require('node:path');
const {randomBytes,randomInt}=require('node:crypto');
const localRequire=createRequire(resolve(process.cwd(),'package.json'));
const {PrismaClient}=localRequire('@prisma/client');
const bcrypt=localRequire('bcrypt');
const SCHOOL_CODE='STEM10TEST';
async function provisionGrade10Demo(db){
 const credentials={schoolCode:SCHOOL_CODE,grade:'Grade 10',pathway:'STEM',track:'Pure Sciences',stream:'10A',admin:{email:'admin@stem10.assignmenthub.test',password:randomBytes(18).toString('base64url')},teacher:{email:'teacher@stem10.assignmenthub.test',password:randomBytes(18).toString('base64url')},student:{admissionNumber:'STEM1001',pin:String(randomInt(100000,1000000))}};
 const [adminHash,teacherHash,studentHash]=await Promise.all([credentials.admin.password,credentials.teacher.password,credentials.student.pin].map(v=>bcrypt.hash(v,12)));
 const ids=await db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('assignmenthub-grade10-demo-provision'))::text`;
  if(await tx.school.findUnique({where:{code:SCHOOL_CODE}}))throw Error('STEM10TEST already exists. No accounts or passwords were changed. Use the school password/PIN reset flow.');
  const stem=await tx.pathway.findFirst({where:{name:{equals:'STEM',mode:'insensitive'}}});
  if(!stem)throw Error('The STEM pathway must exist before provisioning. No curriculum seed was run.');
  let track=await tx.track.findFirst({where:{pathwayId:stem.id,name:{equals:'Pure Sciences',mode:'insensitive'}}});
  if(!track)track=await tx.track.create({data:{pathwayId:stem.id,key:'stem10-demo-pure-sciences',name:'Pure Sciences',description:'Unpublished reference for synthetic Grade 10 demo accounts only.',icon:'atom',isPublished:false,requiredSubjects:[],careers:[],skills:[],universitiesKenya:[],universitiesIntl:[]}});
  const school=await tx.school.create({data:{name:'Assignment Hub Grade 10 STEM Demo',code:SCHOOL_CODE,subscriptionStatus:'ACTIVE'}});
  const stream=await tx.stream.create({data:{school_id:school.id,grade:'Grade 10',name:'10A'}});
  const admin=await tx.user.create({data:{schoolId:school.id,name:'STEM Demo School Admin',role:'SCHOOL_ADMIN',email:credentials.admin.email,passwordHash:adminHash}});
  const teacher=await tx.user.create({data:{schoolId:school.id,name:'STEM Demo Teacher',role:'TEACHER',email:credentials.teacher.email,passwordHash:teacherHash}});
  for(const subject of ['Mathematics','Physics','Chemistry','Biology'])await tx.teacherAssignment.create({data:{school_id:school.id,teacher_id:teacher.id,stream_id:stream.id,subject}});
  const student=await tx.user.create({data:{schoolId:school.id,name:'STEM Demo Learner',role:'STUDENT',grade:'Grade 10',admissionNumber:credentials.student.admissionNumber,passwordHash:studentHash,studentProfile:{create:{admissionNumber:credentials.student.admissionNumber,grade:'Grade 10',stream:'10A',pathway:'STEM'}}}});
  await tx.studentPathwaySelection.create({data:{schoolId:school.id,studentId:student.id,trackId:track.id,source:'MANUAL',notes:'Synthetic Grade 10 STEM test account'}});
  return {schoolId:school.id,adminId:admin.id,teacherId:teacher.id,studentId:student.id};
 },{timeout:30000});
 return {...credentials,...ids};
}
async function verifyLive(credentials,base='https://assignments-hub-api.onrender.com/api/v1'){
 async function login(route,body,role){const r=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`${role} live login failed (HTTP ${r.status}).`);const data=await r.json();if(data.user?.role!==role||!data.accessToken)throw Error(`${role} login response did not match the provisioned account.`);return data.accessToken;}
 await login('/auth/staff/login',{schoolCode:SCHOOL_CODE,...credentials.admin},'SCHOOL_ADMIN');
 const teacher=await login('/auth/staff/login',{schoolCode:SCHOOL_CODE,...credentials.teacher},'TEACHER');
 const student=await login('/auth/student/login',{schoolCode:SCHOOL_CODE,...credentials.student},'STUDENT');
 const s=await fetch(base+'/student/content-scope',{headers:{Authorization:`Bearer ${student}`},signal:AbortSignal.timeout(20000)});if(!s.ok)throw Error(`Student curriculum scope check failed (HTTP ${s.status}).`);const scope=await s.json();if(scope.grade!==10||scope.pathway!=='STEM'||scope.track!=='Pure Sciences')throw Error('Student is not scoped to Grade 10 STEM / Pure Sciences.');
 const roster=await fetch(base+'/teacher/students',{headers:{Authorization:`Bearer ${teacher}`},signal:AbortSignal.timeout(20000)});if(!roster.ok)throw Error(`Teacher roster verification failed (HTTP ${roster.status}).`);
 return true;
}
async function main(){
 if(!process.env.DATABASE_URL)throw Error('Run this command from the backend directory in Render Shell.');
 const db=new PrismaClient();try{
  if(!process.argv.includes('--apply')){console.log(JSON.stringify({mode:'DRY RUN — no writes',schoolCode:SCHOOL_CODE,existingSchool:!!await db.school.findUnique({where:{code:SCHOOL_CODE}}),grade:'Grade 10',pathway:'STEM',track:'Pure Sciences',roles:['SCHOOL_ADMIN','TEACHER','STUDENT'],instruction:'Use --apply to create isolated accounts. Existing accounts are never overwritten.'},null,2));return;}
  const credentials=await provisionGrade10Demo(db);
  console.log('\nSAVE THESE DEMO LOGINS — passwords cannot be recovered from their hashes.\n');console.log(JSON.stringify({loginUrl:'https://assignmenthub.co.ke/login',...credentials},null,2));
  await verifyLive(credentials);console.log('\nVERIFIED: school admin, teacher and Grade 10 STEM student can sign in. Use Staff for admin/teacher, School student for the learner.\n');
 }finally{await db.$disconnect();}
}
module.exports={provisionGrade10Demo,verifyLive};
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});
