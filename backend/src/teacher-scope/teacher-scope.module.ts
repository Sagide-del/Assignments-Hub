import { Global, Module } from "@nestjs/common";
import { TeacherScopeGuard } from "./teacher-scope.guard";
import { TeacherController } from "./teacher.controller";
import { TeacherAdminController } from "./teacher-admin.controller";
@Global()
@Module({
  controllers: [TeacherController, TeacherAdminController],
  providers: [TeacherScopeGuard],
  exports: [TeacherScopeGuard],
})
export class TeacherScopeModule {}
