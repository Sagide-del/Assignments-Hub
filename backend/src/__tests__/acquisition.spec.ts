import { Module, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { RolesGuard } from '../common/guards/roles.guard';
import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AcquisitionService } from '../analytics/acquisition.service';
import { AcquisitionController } from '../analytics/acquisition.controller';
import { AcquisitionEventDto } from '../analytics/dto/acquisition-event.dto';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { Role } from '../common/enums/role.enum';
const dto={session:'eb870134-6101-4ff2-87cf-49344081bb33',stage:'practice_start',path:'/revision/grade-7/mathematics/'};
describe('first-party acquisition counts',()=>{
  test('accepts anonymous stages and rejects personal/query-string payloads',async()=>{
    expect(await validate(plainToInstance(AcquisitionEventDto,dto))).toHaveLength(0);
    for(const bad of [{...dto,stage:'payment_confirmed'},{...dto,session:'student@example.com'},{...dto,path:'/register?phone=0712345678'}]) expect((await validate(plainToInstance(AcquisitionEventDto,bad))).length).toBeGreaterThan(0);
  });
  test('retries are deduplicated under a transaction lock and store no user/IP',async()=>{
    const log:any[]=[];
    const tx={ $executeRaw:jest.fn(), auditLog:{findFirst:jest.fn(async()=>log[0]),create:jest.fn(async({data})=>{log.push({id:1,...data});})}};
    const prisma:any={$transaction:async(fn:any)=>fn(tx)};
    const service=new AcquisitionService(prisma);
    await service.record(dto as AcquisitionEventDto); await service.record(dto as AcquisitionEventDto);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);expect(log).toHaveLength(1);
    expect(Object.keys(log[0]).sort()).toEqual(['action','id','metadata','resource']);
    expect(log[0].metadata).toEqual({path:dto.path});
  });
  test('paid learner total comes from confirmed ledger entries, deduplicated across providers',async()=>{
    const prisma:any={auditLog:{groupBy:jest.fn().mockResolvedValue([{action:'acquisition.practice_start',_count:{_all:3}}])},independentTumaPayment:{findMany:jest.fn().mockResolvedValue([{studentId:1}])},independentJengaPayment:{findMany:jest.fn().mockResolvedValue([{studentId:1},{studentId:2}])}};
    const result=await new AcquisitionService(prisma).summary();
    expect(result.stages[0].sessions).toBe(3);expect(result.confirmedPayingLearners).toBe(2);
    expect(prisma.independentTumaPayment.findMany.mock.calls[0][0].where.status).toBe('CONFIRMED');
    expect(prisma.independentTumaPayment.findMany.mock.calls[0][0].select).toEqual({studentId:true});
  });
  test('collection is public but summary is platform-admin only',()=>{
    expect(Reflect.getMetadata(IS_PUBLIC_KEY,AcquisitionController.prototype.event)).toBe(true);
    expect(Reflect.getMetadata(ROLES_KEY,AcquisitionController.prototype.summary)).toEqual([Role.PLATFORM_ADMIN]);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY,AcquisitionController.prototype.summary)).toBeUndefined();
  });
});

test('HTTP collection validates payloads, enforces throttling and protects reports',async()=>{
 const rows:any[]=[];
 const tx={$executeRaw:jest.fn(),auditLog:{findFirst:async()=>rows[0],create:async({data}:any)=>{rows.push({id:1,...data});}}};
 const prisma={ $transaction:async(fn:any)=>fn(tx), auditLog:{count:async()=>rows.length,groupBy:async()=>[]}, independentTumaPayment:{findMany:async()=>[]}, independentJengaPayment:{findMany:async()=>[]} };
 @Module({imports:[ThrottlerModule.forRoot([{ttl:60000,limit:100}])],controllers:[AcquisitionController],providers:[AcquisitionService,{provide:PrismaService,useValue:prisma}]})
 class Fixture {}
 const app=await NestFactory.create(Fixture,{logger:false});
 app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
 app.useGlobalGuards(new RolesGuard(new Reflector()));
 app.use((req:any,_res:any,next:any)=>{if(req.headers['x-test-role']==='admin')req.user={role:Role.PLATFORM_ADMIN};next();});
 await app.listen(0,'127.0.0.1');const base=await app.getUrl();
 try{
  const post=(body:any)=>fetch(base+'/analytics/acquisition/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  expect((await post(dto)).status).toBe(202);expect((await post(dto)).status).toBe(202);expect(rows).toHaveLength(1);
  expect((await post({...dto,phone:'0712345678'})).status).toBe(400);
  expect((await fetch(base+'/analytics/acquisition')).status).toBe(403);
  expect((await fetch(base+'/analytics/acquisition',{headers:{'x-test-role':'admin'}})).status).toBe(200);
  expect((await fetch(base+'/analytics/acquisition/capabilities')).status).toBe(200);
  let limited=false;for(let i=0;i<41;i++){if((await post(dto)).status===429){limited=true;break;}}
  expect(limited).toBe(true);
 }finally{await app.close();}
});
