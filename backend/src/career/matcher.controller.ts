import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { MatcherService } from "./matcher.service";
import {
  ImportCombinationsDto,
  MatchCombinationsDto,
  SaveCombinationDto,
  SaveKjseaResultsDto,
} from "./matcher.dto";
@Controller("career")
export class MatcherController {
  constructor(private readonly matcher: MatcherService) {}
  @Get("capabilities") @Public() capabilities() {
    return this.matcher.capabilities();
  }
  @Get("kjsea-results")
  @Roles(Role.STUDENT)
  results(@CurrentUser() actor: AuthenticatedUser) {
    return this.matcher.results(actor);
  }
  @Put("kjsea-results")
  @Roles(Role.STUDENT)
  saveResults(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: SaveKjseaResultsDto,
  ) {
    return this.matcher.saveResults(actor, dto);
  }
  @Post("recommend-combinations")
  @Roles(Role.STUDENT)
  recommend(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: MatchCombinationsDto,
  ) {
    return this.matcher.recommend(actor, dto);
  }
  @Post("selection")
  @Roles(Role.STUDENT)
  save(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: SaveCombinationDto,
  ) {
    return this.matcher.save(actor, dto);
  }
  @Delete("combinations/:id")
  @Roles(Role.PLATFORM_ADMIN)
  archive(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string) {
    return this.matcher.archive(id);
  }
  @Get("combinations") @Roles(Role.PLATFORM_ADMIN) catalog() {
    return this.matcher.catalog();
  }
  @Post("combinations/import")
  @Roles(Role.PLATFORM_ADMIN)
  import(@Body() dto: ImportCombinationsDto) {
    return this.matcher.importCatalog(dto);
  }
}
