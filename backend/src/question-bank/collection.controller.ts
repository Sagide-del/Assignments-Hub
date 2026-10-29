import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { DefaultValuePipe } from "@nestjs/common";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { CollectionService } from "./collection.service";
import {
  AssetIdsDto,
  ExistingSourcesDto,
  UploadCollectionFileDto,
  AssetReviewDto,
  CatalogueDto,
  CreateCollectionDto,
  OutcomeGenerationDto,
  OutcomeReviewDto,
  VerifyGradesDto,
} from "./collection.dto";
@Controller("admin/content-ingestion")
@Roles(Role.PLATFORM_ADMIN)
export class CollectionController {
  constructor(private readonly service: CollectionService) {}
  @Get() overview() {
    return this.service.overview();
  }
  @Post("from-library") fromLibrary(
    @Body() dto: ExistingSourcesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.fromLibrary(dto.sourceIds, actor);
  }
  @Get("collections/:id/documents") documents(
    @Param("id") id: string,
    @Query("page", new DefaultValuePipe(0), ParseIntPipe) page: number,
  ) {
    return this.service.documents(id, page);
  }
  @Post("collections") create(
    @Body() dto: CreateCollectionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.create(dto, actor);
  }
  @Post("collections/:id/file")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { files: 1, fileSize: 50 * 1024 * 1024 },
    }),
  )
  upload(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadCollectionFileDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.upload(id, file, actor, dto.relativePath);
  }
  @Get("assets/:id") async asset(@Param("id") id: string) {
    const asset = await this.service.asset(id);
    return {
      ...asset,
      assetKey: undefined,
      extractedText: (asset.extractedText ?? "").slice(0, 500000),
    };
  }
  @Patch("assets/:id") save(
    @Param("id") id: string,
    @Body() dto: AssetReviewDto,
  ) {
    return this.service.saveMapping(
      id,
      dto.mapping,
      dto.sourceLimitationsReviewed,
    );
  }
  @Post("assets/retry") retryAssets(
    @Body() dto: AssetIdsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.retryAssets(dto.ids, actor);
  }
  @Post("assets/review") approve(
    @Body() dto: AssetIdsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.approve(dto.ids, actor);
  }
  @Post("catalogue") catalogue(@Body() dto: CatalogueDto) {
    return this.service.catalogue(dto);
  }
  @Post("catalogue/verify") verify(
    @Body() dto: VerifyGradesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.verifyGrades(dto.grades, actor);
  }
  @Delete("scopes/:id") removeScope(@Param("id", ParseIntPipe) id: number) {
    return this.service.removeEmptyScope(id);
  }
  @Get("scopes/:id/units") units(@Param("id", ParseIntPipe) id: number) {
    return this.service.units(id);
  }
  @Patch("units/:id") unit(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: OutcomeReviewDto,
  ) {
    return this.service.reviewUnit(id, dto);
  }
  @Post("generate") generate(
    @Body() dto: OutcomeGenerationDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.generate(dto, actor);
  }
}
