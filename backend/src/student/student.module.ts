import { MusicProductionService } from "./music-production/production.service";
import { MusicProductionController } from "./music-production/production.controller";
import { MusicStudioController } from "./music/music-studio.controller";
import { MusicStudioService } from "./music/music-studio.service";
import { StudentLabsService } from "./labs.service";
import { StudentLabsController } from "./labs.controller";
import { SubjectEnrollmentService } from "./subject-enrollment.service";
import { SubjectEnrollmentController } from "./subject-enrollment.controller";
import { StudentAssignmentsService } from "./assignments.service";
import { ConfigModule } from "@nestjs/config";
import { LibraryService } from "./library.service";
import { LibraryPdfService } from "./library-pdf.service";
import {
  LibraryDetailController,
  LibraryCapabilitiesController,
} from "./library.controller";
import { RotationCapabilitiesController } from "./rotation-capabilities.controller";
import { RotationService } from "./rotation.service";
import { RotationController } from "./rotation.controller";
import { Global, Module } from "@nestjs/common";
import { StudentScopeService } from "./student-scope.service";
import {
  StudentContentController,
  StudentLibraryController,
} from "./student-content.controller";
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    MusicProductionService,
    MusicStudioService,
    StudentLabsService,
    SubjectEnrollmentService,
    StudentAssignmentsService,
    StudentScopeService,
    RotationService,
    LibraryService,
    LibraryPdfService,
  ],
  exports: [StudentScopeService, SubjectEnrollmentService],
  controllers: [
    MusicProductionController,
    MusicStudioController,
    StudentLabsController,
    SubjectEnrollmentController,
    StudentContentController,
    StudentLibraryController,
    RotationController,
    RotationCapabilitiesController,
    LibraryDetailController,
    LibraryCapabilitiesController,
  ],
})
export class StudentModule {}
