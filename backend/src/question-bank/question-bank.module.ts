import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { AssignmentsModule } from "../assignments/assignments.module";
import {
  QuestionBankAdminController,
  QuestionBankBrowseController,
} from "./question-bank.controller";
import { QuestionBankService } from "./question-bank.service";

// AuditService (used by QuestionBankService) comes from the globally
// registered AuditModule (@Global()) — no explicit import needed here,
// matching AiContentModule's convention.
@Module({
  imports: [AiModule, AssignmentsModule],
  controllers: [QuestionBankAdminController, QuestionBankBrowseController],
  providers: [QuestionBankService],
  exports: [QuestionBankService],
})
export class QuestionBankModule {}
