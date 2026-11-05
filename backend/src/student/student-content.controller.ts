import { StudentAssignmentsService } from "./assignments.service";
import { Controller, Get, Query } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { LibraryService } from "./library.service";
import { StudentScopeService } from "./student-scope.service";
@Controller("student")
export class StudentContentController {
  constructor(private readonly scopes: StudentScopeService,private readonly assignmentService:StudentAssignmentsService) {}
  @Get("content-capabilities") @Public() capabilities() {
    return { studentFilteringVersion: 2 };
  }
  @Get("content-scope") @Roles(Role.STUDENT) async scope(
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const s = await this.scopes.getStudentScope(actor.id, actor.schoolId),
      available = await this.scopes.available(s);
    return {
      ...s,
      availability: {
        labs: available.labs.length,
        skills: available.skills.length,
        csl: s.grade >= 10 && s.grade <= 12,
      },
      assignment_setup_required: s.grade >= 10 && s.elective_subjects?.length !== 3,
      setup_required: s.grade >= 10 && (!s.pathway || !s.track),
    };
  }
  @Get("assignments") @Roles(Role.STUDENT) async assignments(
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.assignmentService.findAll(a);
  }
  @Get("mocks") @Roles(Role.STUDENT) async mocks(
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.catalog(a, "MOCK");
  }
  @Get("skills") @Roles(Role.STUDENT) async skills(
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.catalog(a, "SKILL");
  }
  @Get("labs") @Roles(Role.STUDENT) async labs(
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.catalog(a, "LAB_3D");
  }
  @Get("library") @Roles(Role.STUDENT) async library(
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.catalog(a);
  }
  private async catalog(a: AuthenticatedUser, kind?: string) {
    return this.scopes.modules(
      await this.scopes.getStudentScope(a.id, a.schoolId),
      kind,
    );
  }
}
@Controller("library")
@Roles(Role.STUDENT)
export class StudentLibraryController {
  constructor(
    private readonly scopes: StudentScopeService,
    private readonly libraryService: LibraryService,
  ) {}
  @Get() async library(
    @CurrentUser() a: AuthenticatedUser,
    @Query("grouped") grouped?: string,
  ) {
    if (grouped === "true") return this.libraryService.catalogue(a);
    return this.scopes.modules(
      await this.scopes.getStudentScope(a.id, a.schoolId),
    );
  }
}
