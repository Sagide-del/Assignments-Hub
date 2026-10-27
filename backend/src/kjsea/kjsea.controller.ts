import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Role } from "../common/enums/role.enum";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { CreateMockDto, SaveMockDto } from "./kjsea.dto";
import { KjseaService } from "./kjsea.service";
@Controller("kjsea")
export class KjseaController {
  constructor(private readonly service: KjseaService) {}
  @Get("blueprint") @Public() configuration() {
    return this.service.configuration();
  }
  @Get("subjects") @Roles(Role.STUDENT) subjects(
    @CurrentUser() actor: AuthenticatedUser,
    @Query("grade") grade?: string,
  ) {
    return this.service.subjects(actor, grade);
  }
  @Post("attempts") @Roles(Role.STUDENT) create(
    @Body() dto: CreateMockDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.create(dto, actor);
  }
  @Get("attempts") @Roles(Role.STUDENT) list(
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.list(actor);
  }
  @Get("attempts/:id") @Roles(Role.STUDENT) get(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.get(id, actor);
  }
  @Patch("attempts/:id") @Roles(Role.STUDENT) save(
    @Param("id") id: string,
    @Body() dto: SaveMockDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.save(id, dto, actor);
  }
  @Post("attempts/:id/submit") @Roles(Role.STUDENT) submit(
    @Param("id") id: string,
    @Body() dto: SaveMockDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.submit(id, dto, actor);
  }
  @Delete("attempts/:id") @Roles(Role.STUDENT) discard(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.discard(id, actor);
  }
}
