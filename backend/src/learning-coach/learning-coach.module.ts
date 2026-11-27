import { RecoveryService } from "./recovery.service";
import { EngagementReportService } from "./engagement-report.service";
import {
  LearningHubController,
  LearningHubCapabilitiesController,
} from "./learning-hub.controller";
import { Module } from "@nestjs/common";
import { LearningCoachController } from "./learning-coach.controller";
import { LearningCoachService } from "./learning-coach.service";
import { UploadsModule } from "../uploads/uploads.module";
import { ReportCardService } from "./report-card.service";
import { DocumentOcrModule } from "../document-processing/document-ocr.module";
import { AiModule } from "../ai/ai.module";
import { LessonService } from "./lesson.service";

@Module({
  controllers: [
    LearningCoachController,
    LearningHubController,
    LearningHubCapabilitiesController,
  ],
  providers: [
    LearningCoachService,
    ReportCardService,
    RecoveryService,
    EngagementReportService,
    LessonService,
  ],
  exports: [RecoveryService],
  imports: [UploadsModule, DocumentOcrModule, AiModule],
})
export class LearningCoachModule {}
