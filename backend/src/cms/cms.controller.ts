import { UpdateModuleDto } from "./dto/update-module.dto";
import { TaxonomyQueryDto } from "./dto/taxonomy-query.dto";
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { AuditAction } from "../common/decorators/audit.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { CmsService } from "./cms.service";
import { GenerateAiContentDto } from "./dto/generate-ai-content.dto";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { PublishDto } from "./dto/publish.dto";

@Controller("cms")
export class CmsController {
  constructor(private readonly cms: CmsService) {}

  @Post("drafts")
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction("cms.draft_created")
  createDraft(
    @Body() dto: GenerateAiContentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.cms.generateAiContent(dto, actor);
  }

  @Get("taxonomy")
  @Roles(Role.PLATFORM_ADMIN)
  getTaxonomy(@Query() query: TaxonomyQueryDto) {
    return this.cms.getTaxonomy(query.grade);
  }

  @Get("drafts")
  @Roles(Role.PLATFORM_ADMIN)
  getDrafts() {
    return this.cms.getDrafts();
  }

  @Patch("drafts/:id/approve")
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction("cms.module_approved")
  approve(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.cms.approveModule(id);
  }

  @Post("drafts/:id/enrich")
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction("cms.module_enriched")
  enrich(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.cms.enrichModule(id, actor);
  }

  @Post("publish")
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction("cms.module_published")
  publish(@Body() dto: PublishDto) {
    return this.cms.publishModule(dto);
  }

  @Get("modules")
  @Roles(Role.PLATFORM_ADMIN)
  getModules() {
    return this.cms.getModules();
  }

  @Patch("modules/:id")
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction("cms.module_updated")
  updateModule(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateModuleDto,
  ) {
    return this.cms.updateModule(id, dto.topic);
  }

  @Patch("modules/:id/archive")
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction("cms.module_archived")
  archive(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.cms.archiveModule(id);
  }

  @Get("modules/:id")
  @Roles(Role.PLATFORM_ADMIN)
  getModule(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.cms.getModule(id);
  }

  @Get("publications/schools")
  @Roles(Role.PLATFORM_ADMIN)
  getSchoolPublications() {
    return this.cms.getSchoolPublications();
  }

  @Get("learning")
  @Roles(Role.STUDENT)
  getLearning(@CurrentUser() actor: AuthenticatedUser) {
    return this.cms.getLearningModules(actor);
  }

  @Post("learning/:id/start")
  @Roles(Role.STUDENT)
  startLearning(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.cms.startLearningModule(id, actor);
  }

  @Get("capabilities")
  @Public()
  async capabilities() { return this.cms.capabilities(); }

  @Get("store")
  @Public()
  getPublicStore() {
    return this.cms.getPublicStore();
  }
}
