import arrangements from "./arrangements.json";
import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Role } from "../../common/enums/role.enum";
import { AuthenticatedUser } from "../../auth/interfaces/authenticated-user.interface";
import { PrismaService } from "../../prisma/prisma.service";
import { TeacherScopeGuard } from "../../teacher-scope/teacher-scope.guard";
import { MusicProductionService } from "./production.service";
import { MusicReviewDto, ProductionDto } from "./production.dto";
@Controller("music-production")
export class MusicProductionController {
  constructor(
    private readonly service: MusicProductionService,
    private readonly db: PrismaService,
  ) {}
  @Get("capabilities") @Public() async capabilities() {
    await this.db.music_Project.findFirst({ select: { id: true } });
    const songs = await this.db.music_Song.count();
    return {
      ready: songs >= 18,
      version: 1,
      sampleStudioVersion: 2,
      playableArrangements: arrangements.length,
      songs,
    };
  }
  @Get("songs") @Roles(Role.STUDENT) songs(
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.service.songs(a);
  }
  @Get("projects")
  @Roles(Role.STUDENT)
  @Header("Cache-Control", "private, no-store")
  projects(@CurrentUser() a: AuthenticatedUser) {
    return this.service.projects(a);
  }
  @Get("projects/:id")
  @Roles(Role.STUDENT)
  @Header("Cache-Control", "private, no-store")
  get(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.service.get(id, a);
  }
  @Post("projects") @Roles(Role.STUDENT) create(
    @Body() dto: ProductionDto,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.service.save(dto, a);
  }
  @Put("projects/:id") @Roles(Role.STUDENT) update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: ProductionDto,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.service.save(dto, a, id);
  }
  @Post("projects/:id/submit") @Roles(Role.STUDENT) submit(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.service.submit(id, a);
  }
  @Get("teacher/submissions")
  @Roles(Role.TEACHER)
  @UseGuards(TeacherScopeGuard)
  @Header("Cache-Control", "private, no-store")
  submissions(@CurrentUser() a: AuthenticatedUser) {
    return this.service.submissions(a);
  }
  @Patch("teacher/submissions/:id")
  @Roles(Role.TEACHER)
  @UseGuards(TeacherScopeGuard)
  review(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: MusicReviewDto,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.service.review(id, dto, a);
  }
}
