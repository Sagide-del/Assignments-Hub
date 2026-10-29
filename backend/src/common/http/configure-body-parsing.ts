import { INestApplication } from '@nestjs/common';
import { json, NextFunction, Request, Response } from 'express';

export function configureBodyParsing(app: INestApplication) {
  const curriculumParser = json({ limit: '2mb' });
  // Nest detects existing body parsers by middleware function name, without
  // checking their mount path. Mounting jsonParser directly here makes Nest
  // skip its global JSON parser, leaving auth and webhook bodies empty.
  app.use('/api/v1/admin/content-ingestion', function curriculumJsonBody(
    req: Request, res: Response, next: NextFunction,
  ) {
    return curriculumParser(req, res, next);
  });
  const examParser = json({ limit: '512kb' });
  app.use('/api/v1/kjsea/attempts', function examAnswerJsonBody(
    req: Request, res: Response, next: NextFunction,
  ) {
    return examParser(req, res, next);
  });

}
