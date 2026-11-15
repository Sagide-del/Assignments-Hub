import 'reflect-metadata';
import {plainToInstance} from 'class-transformer';
import {validate} from 'class-validator';
import {blogPaymentReport,validLandingSource,BLOG_LANDING_SOURCES} from '../analytics/landing-source';
import {RegisterIndependentStudentDto} from '../auth/dto/register-independent-student.dto';
import {AcquisitionService} from '../analytics/acquisition.service';
describe('blog acquisition attribution',()=>{
 it('accepts known sources only, without URL parameters or identifiers',async()=>{
  for(const source of BLOG_LANDING_SOURCES)expect(validLandingSource(source)).toBe(source);
  for(const source of ['https://example.test','blog/csl-ideas-for-students?phone=0712345678','/blog/csl-ideas-for-students/','blog/unknown',null])expect(validLandingSource(source)).toBeNull();
  const base={name:'Demo learner',grade:'Grade 9',password:'password-for-test'};
  expect(await validate(plainToInstance(RegisterIndependentStudentDto,{...base,landing_source:BLOG_LANDING_SOURCES[0]}))).toHaveLength(0);
  expect((await validate(plainToInstance(RegisterIndependentStudentDto,{...base,landing_source:'unknown'}))).length).toBeGreaterThan(0);
  expect(await validate(plainToInstance(RegisterIndependentStudentDto,base))).toHaveLength(0);
 });
 it('deduplicates paying learners across providers and renewals while retaining actual confirmed revenue',()=>{
  const source=BLOG_LANDING_SOURCES[0];
  const report=blogPaymentReport([{landing_source:source,_count:{_all:2}}],[{studentId:1,landing_source:source,amountKES:300},{studentId:1,landing_source:source,amountKES:300},{studentId:2,landing_source:source,amountKES:300},{studentId:3,landing_source:null,amountKES:300}]);
  expect(report.find(r=>r.landing_source===source)).toMatchObject({registrations:2,payingLearners:2,confirmedKES:900});
  expect(report.find(r=>r.landing_source===null)).toMatchObject({payingLearners:1,confirmedKES:300});
 });
 it('queries only server-confirmed payments, rather than trusting a browser conversion event',async()=>{
  const p:any={auditLog:{groupBy:jest.fn().mockResolvedValue([])},user:{groupBy:jest.fn().mockResolvedValue([])},independentTumaPayment:{findMany:jest.fn().mockResolvedValue([])},independentJengaPayment:{findMany:jest.fn().mockResolvedValue([])}};
  const r=await new AcquisitionService(p).summary();
  for(const model of [p.independentTumaPayment,p.independentJengaPayment])expect(model.findMany.mock.calls[0][0].where.status).toBe('CONFIRMED');
  expect(r.blogAttribution).toHaveLength(BLOG_LANDING_SOURCES.length+1);expect(r.confirmedPayingLearners).toBe(0);
 });
});

it('adopts a first blog source for an existing untracked learner but preserves an existing source',async()=>{
 const {paymentLandingSource}=await import('../analytics/payment-attribution');
 let source:string|null=null;
 const tx:any={user:{findUniqueOrThrow:jest.fn(async()=>({landing_source:source})),updateMany:jest.fn(async({data})=>{source=data.landing_source;return {count:1};})}};
 expect(await paymentLandingSource(tx,1,'blog/csl-ideas-for-students')).toBe('blog/csl-ideas-for-students');
 expect(await paymentLandingSource(tx,1,'blog/core-vs-essential-mathematics')).toBe('blog/csl-ideas-for-students');
 expect(tx.user.updateMany).toHaveBeenCalledTimes(1);
});
