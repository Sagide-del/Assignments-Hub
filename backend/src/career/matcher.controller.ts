import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { MatcherService } from "./matcher.service";
import { CareerDecisionBriefService } from "./career-decision-brief.service";
import {
  ImportCombinationsDto,
  MatchCombinationsDto,
  SaveCombinationDto,
  SaveKjseaResultsDto,
} from "./matcher.dto";
@Controller("career")
export class MatcherController {
  constructor(private readonly matcher: MatcherService, private readonly decisionBrief: CareerDecisionBriefService) {}
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
  @Get("decision-brief.pdf")
  @Roles(Role.STUDENT)
  async downloadDecisionBrief(@CurrentUser() actor: AuthenticatedUser, @Res() response: Response) {
    const [guide, student] = await Promise.all([this.matcher.recommend(actor, {}), this.matcher.assertStudent(actor)]);
    const pdf = await this.decisionBrief.render({ student, guide });
    response.set({ "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=assignment-hub-grade-10-decision-brief.pdf" });
    response.send(pdf);
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
