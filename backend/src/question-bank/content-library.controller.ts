import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { ContentLibraryService } from "./content-library.service";
import { ImportSourcesDto, LibraryGenerationDto } from "./content-library.dto";
@Controller("admin/content-library")
@Roles(Role.PLATFORM_ADMIN)
export class ContentLibraryController {
  constructor(private readonly library: ContentLibraryService) {}
  @Get() overview() {
    return this.library.overview();
  }
  @Post("discover")
  @UseInterceptors(
    FileInterceptor("file", { limits: { files: 1, fileSize: 1024 * 1024 } }),
  )
  discover(@UploadedFile() file?: Express.Multer.File) {
    return this.library.discover(file);
  }
  @Post("import") imports(
    @Body() dto: ImportSourcesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.library.imports(dto, actor);
  }
  @Post("generate") generate(
    @Body() dto: LibraryGenerationDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.library.generate(dto, actor);
  }
  @Post("jobs/:id/retry") retry(@Param("id") id: string) {
    return this.library.retry(id);
  }
}
