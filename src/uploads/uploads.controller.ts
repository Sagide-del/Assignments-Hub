import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomBytes } from 'crypto';

// Generic authenticated file upload used by both the teacher assignment
// builder (attachments) and student submissions (FILE_UPLOAD question
// answers). Returns a URL the caller stores as plain data (in Assignment
// .attachments / Answer.studentAnswer) rather than the file itself living
// in Postgres. Any authenticated role can use it — JwtAuthGuard (global)
// already requires a valid session; there's nothing role-specific about
// "upload a file and get a URL back".
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

// main.ts serves everything under ./uploads as static files from the SAME
// origin as the rest of the app (`app.use('/uploads', express.static(...))`).
// Without an allowlist here, anyone could upload an .html/.svg/.js file
// containing a <script> and get it served back same-origin — a stored XSS
// vector, since the browser would execute it with this app's cookies/DOM
// in scope. Restricting to known-safe document/image/media types (never
// html/svg/xml/script-executable extensions) closes that off. Extend this
// list if a legitimate new file type is needed, but never add html/htm/svg/
// xml/js/mjs/php or other browser/server-executable formats.
const ALLOWED_MIMETYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'video/mp4',
  'audio/mpeg',
]);
const ALLOWED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.mp4', '.mp3',
]);

@Controller('uploads')
export class UploadsController {
  @Post('single')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, callback) => {
          const unique = `${Date.now()}-${randomBytes(6).toString('hex')}`;
          const safeExt = extname(file.originalname).slice(0, 10);
          callback(null, `${unique}${safeExt}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        const ext = extname(file.originalname).toLowerCase();
        if (!ALLOWED_MIMETYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
          callback(new BadRequestException(`Unsupported file type "${file.mimetype || ext}"`), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  uploadSingle(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'No file was uploaded (expected multipart field "file"), or the file type is not supported',
      );
    }
    return {
      url: `/uploads/${file.filename}`,
      filename: file.originalname,
      size: file.size,
    };
  }
}
