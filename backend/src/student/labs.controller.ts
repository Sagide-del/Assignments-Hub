import { Controller, Get } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { StudentLabsService } from "./labs.service";
import { PrismaService } from "../prisma/prisma.service";
@Controller("student")
export class StudentLabsController {
  constructor(
    private readonly labs: StudentLabsService,
    private readonly db: PrismaService,
  ) {}
  @Get("lab-router-capabilities")
  @Public()
  async capabilities() {
    await this.db.masterModule.findFirst({ select: { lab_category: true } });
    return { version: 1, ready: true };
  }
  @Get("lab-config")
  @Roles(Role.STUDENT)
  config(@CurrentUser() actor: AuthenticatedUser) {
    return this.labs.getLabConfig(actor.id, actor.schoolId);
  }
  @Get("lab-modules")
  @Roles(Role.STUDENT)
  modules(@CurrentUser() actor: AuthenticatedUser) {
    return this.labs.getLabsForStudent(actor.id, actor.schoolId);
  }
}
