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
    }),
  )
  uploadSingle(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file was uploaded (expected multipart field "file")');
    }
    return {
      url: `/uploads/${file.filename}`,
      filename: file.originalname,
      size: file.size,
    };
  }
}
