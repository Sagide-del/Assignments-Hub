import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';
import * as fs from 'fs';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS configuration
  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin: string) => origin.trim())
    : '*';
  app.enableCors({ origin: corsOrigin, exposedHeaders: ['Content-Disposition'] });

  // Helmet
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  
  // Serve uploaded files
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // ============================================================
  // ✅ FIND AND SERVE FRONTEND FILES
  // ============================================================
  // Try multiple possible paths
  const possiblePaths = [
    join(__dirname, '..', '..', 'frontend'),
    join(process.cwd(), 'frontend'),
    join(__dirname, '..', 'frontend'),
    join(process.cwd(), '..', 'frontend'),
  ];

  let frontendPath = null;
  for (const path of possiblePaths) {
    if (fs.existsSync(path)) {
      frontendPath = path;
      console.log(`✅ Found frontend at: ${frontendPath}`);
      break;
    }
  }

  if (frontendPath) {
    app.use(express.static(frontendPath));
  } else {
    console.warn('⚠️ Frontend folder not found! Please check the path.');
  }

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