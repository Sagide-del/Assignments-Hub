import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Registered before helmet/static below so CORS headers apply uniformly
  // to every response, including static /uploads files — Express
  // middleware runs in registration order, and a response sent by an
  // earlier middleware (e.g. express.static) never picks up headers from
  // one registered after it.
  // exposedHeaders lets frontend JS read Content-Disposition on file
  // downloads (e.g. the Excel import template) — browsers hide it from
  // fetch() Response.headers by default on cross-origin requests.
  // CORS_ORIGIN can be a comma-separated list of allowed origins for
  // production (e.g. "https://app.example.com,https://admin.example.com").
  // Left unset it falls back to "*" for local development.
  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : '*';
  app.enableCors({ origin: corsOrigin, exposedHeaders: ['Content-Disposition'] });

  // Helmet blocks cross-origin loading of static assets by default
  // (crossOriginResourcePolicy: same-origin), which breaks uploaded
  // attachments/images being fetched from a different frontend origin.
  // Relax it only for the /uploads path.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  // Serves files written by UploadsController (POST /api/v1/uploads/single)
  // at their returned URL, e.g. /uploads/167...-abc.pdf. Deliberately not
  // under the /api/v1 prefix (that's set below and only applies to
  // controller routes) so upload URLs stay short and stable.
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // Strip unknown fields and reject requests with extra/invalid properties.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Assignments Hub API listening on port ${port}`);
}

bootstrap();
