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
  providers: [StudentScopeService, RotationService],
  exports: [StudentScopeService],
  controllers: [
    StudentContentController,
    StudentLibraryController,
    RotationController,
    RotationCapabilitiesController,
  ],
})
export class StudentModule {}
