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
    StudentScopeService,
    RotationService,
    LibraryService,
    LibraryPdfService,
  ],
  exports: [StudentScopeService],
  controllers: [
    StudentContentController,
    StudentLibraryController,
    RotationController,
    RotationCapabilitiesController,
    LibraryDetailController,
    LibraryCapabilitiesController,
  ],
})
export class StudentModule {}
