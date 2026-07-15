import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { Request, Response, NextFunction } from 'express';

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
  // ✅ SERVE FRONTEND STATIC FILES (BEFORE global prefix)
  // ============================================================
  const frontendPath = join(__dirname, '..', '..', 'frontend');
  console.log(`Serving frontend from: ${frontendPath}`);
  app.use(express.static(frontendPath));

  // ============================================================
  // ✅ FALLBACK: Send login page for any unknown route (except API)
  // ============================================================
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return next();
    }
    // Send the login page for any other route
    res.sendFile(join(frontendPath, 'unified-dashboard', 'index.html'));
  });

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