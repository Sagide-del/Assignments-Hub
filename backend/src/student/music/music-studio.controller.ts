import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Role } from "../../common/enums/role.enum";
import { AuthenticatedUser } from "../../auth/interfaces/authenticated-user.interface";
import { PrismaService } from "../../prisma/prisma.service";
import { MusicStudioService } from "./music-studio.service";
import { MusicProjectDto } from "./music-project.dto";
@Controller("student/music-studio")
export class MusicStudioController {
  constructor(
    private readonly music: MusicStudioService,
    private readonly db: PrismaService,
  ) {}
  @Get("capabilities") @Public() async capabilities() {
    await this.db.music_Studio_Project.findFirst({ select: { id: true } });
    return { ready: true, version: 1 };
  }
  @Get("projects")
  @Roles(Role.STUDENT)
  @Header("Cache-Control", "private, no-store")
  list(@CurrentUser() a: AuthenticatedUser) {
    return this.music.list(a);
  }
  @Get("projects/:id")
  @Roles(Role.STUDENT)
  @Header("Cache-Control", "private, no-store")
  get(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.music.get(id, a);
  }
  @Post("projects") @Roles(Role.STUDENT) save(
    @Body() dto: MusicProjectDto,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.music.save(dto, a);
  }
  @Put("projects/:id") @Roles(Role.STUDENT) update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: MusicProjectDto,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.music.save(dto, a, id);
  }
}
