import {PrismaClient,SubscriptionInterval} from '@prisma/client';
import {Role} from '../common/enums/role.enum';
import {randomUUID} from 'crypto';
import {AuthService} from '../auth/auth.service';
import {TumaPaymentsService} from '../independent-students/tuma-payments.service';
import {JengaPaymentsService} from '../independent-students/jenga-payments.service';
import {AcquisitionService} from '../analytics/acquisition.service';
const run=process.env.SEO_TEST_DATABASE_URL?describe:describe.skip;
run('blog attribution on migrated PostgreSQL; no live payment calls',()=>{
 let db:PrismaClient, fixtureUserId:number|undefined;
 afterEach(async()=>{if(fixtureUserId){await db.payment.deleteMany({where:{user_id:fixtureUserId}});await db.user.delete({where:{id:fixtureUserId}});fixtureUserId=undefined;}});
 beforeAll(async()=>{const url=new URL(process.env.SEO_TEST_DATABASE_URL!);if(url.hostname!=='127.0.0.1'||url.pathname!=='/seo_attribution_test')throw Error('Use disposable localhost seo_attribution_test only');db=new PrismaClient({datasources:{db:{url:url.toString()}}});await db.$connect();});
 afterAll(async()=>{await db?.$disconnect();});
 it('persists first touch through registration and both provider ledgers; counts only confirmed payments',async()=>{
  const source='blog/csl-ideas-for-students';
  const auth=new AuthService(db as never,{sign:jest.fn()} as never,{record:jest.fn()} as never,{get:jest.fn()} as never);
  const result=await auth.registerIndependentStudent({name:'SEO database learner',username:'seo.'+randomUUID().slice(0,8),grade:'Grade 9',password:'local-fixture-only-password',landing_source:source});
  fixtureUserId=result.studentId;
  const user=await db.user.findUniqueOrThrow({where:{id:result.studentId}});expect(user.landing_source).toBe(source);
  const actor={id:user.id,schoolId:user.schoolId,role:Role.STUDENT,name:user.name,email:user.email,admissionNumber:user.admissionNumber,grade:user.grade,isIndependentTrial:user.isIndependentTrial};
  const independent={getPaymentInfo:()=>({monthlyAmountKES:300,annualAmountKES:3600})};
  const tumaProvider={isConfigured:()=>true,callbackUrl:()=> 'https://example.invalid/callback',initiate:jest.fn(async()=>({checkoutRequestId:randomUUID(),merchantRequestId:randomUUID()}))};
  const tuma=new TumaPaymentsService(db as never,tumaProvider as never,independent as never);
  await tuma.start(actor,{phone:'0712345678',interval:SubscriptionInterval.MONTHLY,idempotencyKey:randomUUID()});
  const payment=await db.independentTumaPayment.findFirstOrThrow({where:{studentId:user.id}});expect(payment.landing_source).toBe(source);expect((await db.payment.findUniqueOrThrow({where:{legacy_tuma_id:payment.id}})).landing_source).toBe(source);
  const jengaProvider={isConfigured:()=>true,initiate:jest.fn(async()=>({providerReference:randomUUID()}))};
  const jenga=new JengaPaymentsService(db as never,jengaProvider as never,independent as never);
  await jenga.start(actor,{landing_source:'blog/core-vs-essential-mathematics',phone:'0712345678',interval:SubscriptionInterval.MONTHLY,idempotencyKey:randomUUID()});
  const other=await db.independentJengaPayment.findFirstOrThrow({where:{studentId:user.id}});expect(other.landing_source).toBe(source);
  const service=new AcquisitionService(db as never);await service.ready();
  const before=await service.summary();expect(before.blogAttribution.find(r=>r.landing_source===source)?.payingLearners).toBe(0);
  // These are isolated fixture state changes, not provider callbacks or activation.
  await db.independentTumaPayment.update({where:{id:payment.id},data:{status:'CONFIRMED',paidAt:new Date()}});
  await db.independentJengaPayment.update({where:{id:other.id},data:{status:'CONFIRMED',paidAt:new Date()}});
  const report=await service.summary();expect(report.blogAttribution.find(r=>r.landing_source===source)).toMatchObject({payingLearners:1,confirmedKES:600});
  expect(tumaProvider.initiate).toHaveBeenCalledTimes(1);expect(jengaProvider.initiate).toHaveBeenCalledTimes(1);
 });
});
