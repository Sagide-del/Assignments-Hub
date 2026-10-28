import {
  CurriculumLibraryController,
  CurriculumCapabilitiesController,
} from "./curriculum-library.controller";
import { CurriculumLibraryService } from "./curriculum-library.service";
import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { AssignmentsModule } from "../assignments/assignments.module";
import { AiArtifactMapperService } from "./ai-artifact-mapper.service";
import { AiArtifactService } from "./ai-artifact.service";
import { AiContentController } from "./ai-content.controller";
import { AiExtractionService } from "./ai-extraction.service";
import { AiFeatureConfigService } from "./ai-feature-config.service";
import { AiMonitoringService } from "./ai-monitoring.service";
import { AiPublishService } from "./ai-publish.service";
import { AiQueueService } from "./ai-queue.service";
import { AiQuotaService } from "./ai-quota.service";
import { AiSourceStorageService } from "./ai-source-storage.service";
import { AiTopicAssignmentService } from "./ai-topic-assignment.service";
import { AiFeatureGuard } from "./guards/ai-feature.guard";
import { AiQuotaGuard } from "./guards/ai-quota.guard";
import { DocumentOcrModule } from "../document-processing/document-ocr.module";

@Module({
  imports: [AiModule, AssignmentsModule, DocumentOcrModule],
  controllers: [
    AiContentController,
    CurriculumLibraryController,
    CurriculumCapabilitiesController,
  ],
  providers: [
    CurriculumLibraryService,
    AiFeatureConfigService,
    AiQuotaService,
    AiSourceStorageService,
    AiExtractionService,
    AiArtifactMapperService,
    AiTopicAssignmentService,
    AiArtifactService,
    AiPublishService,
    AiMonitoringService,
    AiQueueService,
    AiFeatureGuard,
    AiQuotaGuard,
  ],
  exports: [
    AiFeatureConfigService,
    AiExtractionService,
    AiTopicAssignmentService,
    AiArtifactService,
    AiPublishService,
    AiMonitoringService,
  ],
})
export class AiContentModule {}
