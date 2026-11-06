import { Module } from "@nestjs/common";
import { LearningCoachController } from "./learning-coach.controller";
import { LearningCoachService } from "./learning-coach.service";
import { UploadsModule } from "../uploads/uploads.module";
import { ReportCardService } from "./report-card.service";
import { DocumentOcrModule } from "../document-processing/document-ocr.module";

@Module({
  controllers: [LearningCoachController],
  providers: [LearningCoachService, ReportCardService],
  imports: [UploadsModule, DocumentOcrModule],
})
export class LearningCoachModule {}
