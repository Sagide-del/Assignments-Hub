import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service';
import { StudentScopeService } from '../student/student-scope.service';
const {provisionGrade10Demo}=require('../../scripts/operations/provision-grade10-demo.cjs');
const integration=process.env.CMS_TEST_DATABASE_URL?describe:describe.skip;
integration('Grade 10 STEM demo provisioning',()=>{
 let db:PrismaClient,createdPathway:number|undefined;
 async function cleanup(){await db.school.deleteMany({where:{code:'STEM10TEST'}});await db.track.deleteMany({where:{key:'stem10-demo-pure-sciences'}});}
 beforeAll(async()=>{const url=new URL(process.env.CMS_TEST_DATABASE_URL!);if(url.hostname!=='127.0.0.1'||url.pathname!=='/cms_publish_test')throw Error('Use disposable cms_publish_test database.');db=new PrismaClient({datasources:{db:{url:url.toString()}}});await cleanup();if(!await db.pathway.findFirst({where:{name:'STEM'}})){const p=await db.pathway.create({data:{key:'grade10-demo-test-stem',name:'STEM',description:'Fixture only',icon:'atom'}});createdPathway=p.id;}});
 afterAll(async()=>{if(db){await cleanup();if(createdPathway)await db.pathway.delete({where:{id:createdPathway}});await db.$disconnect();}});
 it('creates three isolated accounts with working credentials and the right grade/track/teacher scope',async()=>{
  const c=await provisionGrade10Demo(db);expect(c.grade).toBe('Grade 10');
  const users=await db.user.findMany({where:{schoolId:c.schoolId}});expect(users.map(u=>u.role).sort()).toEqual(['SCHOOL_ADMIN','STUDENT','TEACHER']);expect(users.some(u=>u.role==='PLATFORM_ADMIN')).toBe(false);
  const auth=new AuthService(db as any,new JwtService({secret:'local-grade10-fixture'}),{record:async()=>{}} as any,new ConfigService());
  const admin=await auth.loginStaff({schoolCode:c.schoolCode,...c.admin});expect(admin.user.role).toBe('SCHOOL_ADMIN');const teacher=await auth.loginStaff({schoolCode:c.schoolCode,...c.teacher});expect(teacher.user.role).toBe('TEACHER');const student=await auth.loginStudent({schoolCode:c.schoolCode,...c.student});expect(student.user.grade).toBe('Grade 10');
  const scope=await new StudentScopeService(db as any).getStudentScope(c.studentId,c.schoolId);expect(scope.pathway).toBe('STEM');expect(scope.track).toBe('Pure Sciences');expect(scope.grade).toBe(10);
  const pairs=await db.teacherAssignment.findMany({where:{teacher_id:c.teacherId},include:{stream:true}});expect(pairs).toHaveLength(4);expect(pairs.every(p=>p.stream.name==='10A'&&p.school_id===c.schoolId)).toBe(true);
  await expect(provisionGrade10Demo(db)).rejects.toThrow('already exists');expect((await db.user.findUniqueOrThrow({where:{id:c.teacherId}})).passwordHash).toBe(users.find(u=>u.id===c.teacherId)!.passwordHash);
 },30000);
});
