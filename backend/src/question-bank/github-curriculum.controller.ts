import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  Equals,
  IsArray,
  IsIn,
  IsString,
  MaxLength,
} from "class-validator";
import { Role } from "../common/enums/role.enum";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { CONTENT_GRADES } from "./official-curriculum";
import { GitHubCurriculumService } from "./github-curriculum.service";
export class ImportRepositoryCurriculumDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsIn(CONTENT_GRADES, { each: true })
  grades: string[];
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(80)
  @ArrayUnique()
  @IsString({ each: true })
  fileIds: string[];
  @IsString() @MaxLength(40) commit: string;
  @Equals(true) rightsConfirmed: true;
}
export class PrepareRepositoryGradeDto {
  @IsIn(CONTENT_GRADES) grade: string;
  @IsString() @MaxLength(40) commit: string;
  @Equals(true) rightsConfirmed: true;
  @Equals(true) acceptSourceLimitations: true;
}
@Controller("admin/content-ingestion/github")
@Roles(Role.PLATFORM_ADMIN)
export class GitHubCurriculumController {
  constructor(private readonly service: GitHubCurriculumService) {}
  @Get() catalogue(@Query("grade") grade?: string) {
    return this.service.catalogue(grade);
  }
  @Post("prepare") prepare(
    @Body() dto: PrepareRepositoryGradeDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.prepareGrade(dto, actor);
  }
  @Post("import") import(
    @Body() dto: ImportRepositoryCurriculumDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.importDesigns(dto, actor);
  }
}
