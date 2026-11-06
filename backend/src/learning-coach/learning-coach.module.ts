import { Module } from "@nestjs/common";
import { LearningCoachController } from "./learning-coach.controller";
import { LearningCoachService } from "./learning-coach.service";
import { UploadsModule } from "../uploads/uploads.module";
import { ReportCardService } from "./report-card.service";

@Module({
  controllers: [LearningCoachController],
  providers: [LearningCoachService, ReportCardService],
  imports: [UploadsModule],
})
export class LearningCoachModule {}
