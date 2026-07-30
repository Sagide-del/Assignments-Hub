import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { AssignmentsModule } from "../assignments/assignments.module";
import { AiArtifactMapperService } from "./ai-artifact-mapper.service";
import { AiArtifactService } from "./ai-artifact.service";
import { AiExtractionService } from "./ai-extraction.service";
import { AiFeatureConfigService } from "./ai-feature-config.service";
import { AiPublishService } from "./ai-publish.service";
import { AiQuotaService } from "./ai-quota.service";
import { AiSourceStorageService } from "./ai-source-storage.service";
import { AiTopicAssignmentService } from "./ai-topic-assignment.service";

@Module({
  imports: [AiModule, AssignmentsModule],
  providers: [
    AiFeatureConfigService,
    AiQuotaService,
    AiSourceStorageService,
    AiExtractionService,
    AiArtifactMapperService,
    AiTopicAssignmentService,
    AiArtifactService,
    AiPublishService,
  ],
  exports: [
    AiFeatureConfigService,
    AiExtractionService,
    AiTopicAssignmentService,
    AiArtifactService,
    AiPublishService,
  ],
})
export class AiContentModule {}
