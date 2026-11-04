import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { UploadsModule } from "../uploads/uploads.module";
import { CslController } from "./csl.controller";
import { CslService } from "./csl.service";
import { CslTaggingService } from "./csl-tagging.service";
import { CslPhotoService } from "./csl-photo.service";
import { CslPdfService } from "./csl-pdf.service";
@Module({
  imports: [AiModule, UploadsModule],
  controllers: [CslController],
  providers: [CslService, CslTaggingService, CslPhotoService, CslPdfService],
})
export class CslModule {}
