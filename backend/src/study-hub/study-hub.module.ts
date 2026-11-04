import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { CmsModule } from "../cms/cms.module";
import { UploadsModule } from "../uploads/uploads.module";
import { CslPhotoService } from "../csl/csl-photo.service";
import { TimetableController } from "./timetable.controller";
import { TimetableService } from "./timetable.service";
import { TimetableContextService } from "./timetable-context.service";
import { TimetablePdfService } from "./timetable-pdf.service";
@Module({
  imports: [AiModule, CmsModule, UploadsModule],
  controllers: [TimetableController],
  providers: [
    TimetableService,
    TimetableContextService,
    TimetablePdfService,
    CslPhotoService,
  ],
})
export class StudyHubModule {}
