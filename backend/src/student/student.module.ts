import { Global, Module } from "@nestjs/common";
import { StudentScopeService } from "./student-scope.service";
import {
  StudentContentController,
  StudentLibraryController,
} from "./student-content.controller";
@Global()
@Module({
  providers: [StudentScopeService],
  exports: [StudentScopeService],
  controllers: [StudentContentController, StudentLibraryController],
})
export class StudentModule {}
