import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { ConfigModule } from "@nestjs/config";
import { UploadsModule } from "../uploads/uploads.module";
import { CslPhotoService } from "../csl/csl-photo.service";
import { ReportBookService } from "./report-book.service";
import { ReportBookPdfService } from "./report-book.pdf";
import {
  ReportBookController,
  ReportBookCapabilitiesController,
} from "./report-book.controller";
@Module({
  imports: [AiModule, ConfigModule, UploadsModule],
  controllers: [ReportBookController, ReportBookCapabilitiesController],
  providers: [ReportBookService, ReportBookPdfService, CslPhotoService],
})
export class ReportBookModule {}
