import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import * as express from "express";
import { join } from "path";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS configuration
  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((origin: string) => origin.trim())
    : "*";

  app.enableCors({
    origin: corsOrigin,
    exposedHeaders: ["Content-Disposition"],
  });

  // Helmet
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  // Serve uploaded files
  app.use("/uploads", express.static(join(process.cwd(), "uploads")));

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  // API prefix
  app.setGlobalPrefix("api/v1");

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Assignment Hub API")
    .setDescription(
      "Multi-tenant learning, assessment, billing, and AI content APIs.",
    )
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, swaggerDocument, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  await app.listen(port);

  console.log(`Assignments Hub API listening on port ${port}`);
}

bootstrap();
