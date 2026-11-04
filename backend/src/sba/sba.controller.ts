import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { SbaService } from "./sba.service";
import { RecordSbaDto, SbaFiltersDto } from "./sba.dto";
import { TeacherScopeGuard } from "../teacher-scope/teacher-scope.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
@Controller("sba")
@UseGuards(TeacherScopeGuard)
export class SbaController {
  constructor(private readonly sba: SbaService) {}
  @Get("capabilities") @Public() capabilities() {
    return this.sba.capabilities();
  }
  @Post("record") @Roles(Role.TEACHER) record(
    @Body() dto: RecordSbaDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.sba.record(dto, actor);
  }
  @Get("teaching/:id") @Roles(Role.TEACHER) teaching(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.sba.teaching(id, actor);
  }
  @Get("student/:id")
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  student(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.sba.student(id, actor);
  }
  @Get("school/:school_id")
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  school(
    @Param("school_id", ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
    @Query() filters: SbaFiltersDto,
  ) {
    return this.sba.school(id, actor, filters);
  }
  @Get("school/:school_id/export")
  @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  async csv(
    @Param("school_id", ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
    @Query() filters: SbaFiltersDto,
    @Res() res: Response,
  ) {
    const csv = await this.sba.csv(id, actor, filters);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="school-${id}-sba-projections.csv"`,
    );
    res.send(csv);
  }
}
