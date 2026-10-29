import { GitHubCurriculumService } from "./github-curriculum.service";
import { GitHubCurriculumController } from "./github-curriculum.controller";
import { CollectionService } from "./collection.service";
import { CollectionController } from "./collection.controller";
import { UploadsModule } from "../uploads/uploads.module";
import { ContentCapabilitiesController } from "./content-capabilities.controller";
import { PracticeController } from "./practice.controller";
import { PracticeService } from "./practice.service";
import { ContentLibraryController } from "./content-library.controller";
import { ContentLibraryService } from "./content-library.service";
import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { AssignmentsModule } from "../assignments/assignments.module";
import {
  QuestionBankAdminController,
  QuestionBankBrowseController,
} from "./question-bank.controller";
import { QuestionBankService } from "./question-bank.service";
import { QuestionBankRetrievalService } from "./question-bank-retrieval.service";
import { QuestionBankEmbeddingService } from "./question-bank-embedding.service";
import { DocumentOcrModule } from "../document-processing/document-ocr.module";

// AuditService (used by QuestionBankService) comes from the globally
// registered AuditModule (@Global()) — no explicit import needed here,
// matching AiContentModule's convention.
@Module({
  imports: [UploadsModule, AiModule, AssignmentsModule, DocumentOcrModule],
  controllers: [
    CollectionController,
    GitHubCurriculumController,
    ContentCapabilitiesController,
    PracticeController,
    ContentLibraryController,
    QuestionBankAdminController,
    QuestionBankBrowseController,
  ],
  providers: [
    CollectionService,
    GitHubCurriculumService,
    PracticeService,
    ContentLibraryService,
    QuestionBankService,
    QuestionBankRetrievalService,
    QuestionBankEmbeddingService,
  ],
  exports: [QuestionBankService],
})
export class QuestionBankModule {}
