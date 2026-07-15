import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS configuration
  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : '*';
  app.enableCors({ origin: corsOrigin, exposedHeaders: ['Content-Disposition'] });

  // Helmet
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  
  // Serve uploaded files
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // ============================================================
  // ✅ SERVE FRONTEND STATIC FILES
  // ============================================================
  // This serves all files from the frontend folder
  // So when you go to https://assignmenthub.co.ke/
  // It will serve frontend/unified-dashboard/index.html
  const frontendPath = join(__dirname, '..', '..', 'frontend');
  app.use(express.static(frontendPath));

  // Validation
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
  console.log(`Assignments Hub API listening on port ${port}`);
}

bootstrap();