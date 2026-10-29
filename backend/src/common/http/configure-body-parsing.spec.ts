import { Body, Controller, INestApplication, Module, Post, RawBodyRequest, Req, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Request } from 'express';
import { StaffLoginDto } from '../../auth/dto/staff-login.dto';
import { RegisterIndependentStudentDto } from '../../auth/dto/register-independent-student.dto';
import { RefreshTokenDto } from '../../auth/dto/refresh-token.dto';
import { configureBodyParsing } from './configure-body-parsing';

@Controller()
class ParsingProbeController {
  @Post('auth/staff/login')
  login(@Body() body: StaffLoginDto) { return { schoolCode: body.schoolCode, email: body.email }; }

  @Post('auth/independent/register')
  register(@Body() body: RegisterIndependentStudentDto) { return { name: body.name, grade: body.grade }; }

  @Post('auth/refresh')
  refresh(@Body() body: RefreshTokenDto) { return { received: Boolean(body.refreshToken) }; }

  @Post('admin/content-ingestion/probe')
  ingestion(@Body() body: { text: string }) { return { length: body.text.length }; }

  @Post('kjsea/attempts/probe')
  exam(@Body() body: { text: string }) { return { length: body.text.length }; }

  @Post('payment/webhook/probe')
  webhook(@Req() req: RawBodyRequest<Request>) {
    return { body: req.body, raw: req.rawBody?.toString('utf8') };
  }
}
@Module({ controllers: [ParsingProbeController] })
class ParsingProbeModule {}

describe('Production JSON parser configuration', () => {
  let app: INestApplication;
  let base: string;
  beforeAll(async () => {
    app = await NestFactory.create(ParsingProbeModule, { rawBody: true, logger: false });
    configureBodyParsing(app);
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(0, '127.0.0.1');
    base = `${await app.getUrl()}/api/v1`;
  });
  afterAll(async () => { await app?.close(); });
  const post = (path: string, body: unknown) => fetch(`${base}/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });

  it('delivers staff login fields to the real validation pipe', async () => {
    const response = await post('auth/staff/login', { schoolCode: 'PLATFORM', email: 'owner@example.test', password: 'test-only-password' });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ schoolCode: 'PLATFORM', email: 'owner@example.test' });
  });
  it('delivers learner registration fields to the real validation pipe', async () => {
    const response = await post('auth/independent/register', { name: 'Test learner', username: 'test.learner', password: 'test-only-password', grade: 'Grade 7' });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ name: 'Test learner', grade: 'Grade 7' });
  });
  it('keeps refresh token requests readable', async () => {
    const response = await post('auth/refresh', { refreshToken: 'test-only-refresh-token' });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ received: true });
  });
  it('still rejects missing credentials', async () => {
    expect((await post('auth/staff/login', {})).status).toBe(400);
  });
  it('preserves the exact original payment webhook bytes', async () => {
    const raw = '{ "event": "payment", "amount": 100, "label": "KSh ✓" }\n';
    const response = await fetch(`${base}/payment/webhook/probe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ body: JSON.parse(raw), raw });
  });
  it('accepts larger curriculum mappings without increasing other route limits', async () => {
    const body = { text: 'a'.repeat(150 * 1024) };
    const curriculum = await post('admin/content-ingestion/probe', body);
    expect(curriculum.status).toBe(201);
    expect(await curriculum.json()).toEqual({ length: body.text.length });
    expect((await post('payment/webhook/probe', body)).status).toBe(413);
  });  it('accepts saved working beyond the default JSON limit without changing webhook parsing', async () => {
    const response = await post('kjsea/attempts/probe', { text: 'a'.repeat(300 * 1024) });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ length: 300 * 1024 });
    expect((await post('kjsea/attempts/probe', { text: 'a'.repeat(513 * 1024) })).status).toBe(413);
  });

});
