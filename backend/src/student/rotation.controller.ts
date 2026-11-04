import { Controller, Get, Header, Param } from "@nestjs/common";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { RotationService } from "./rotation.service";
@Controller("student")
@Roles(Role.STUDENT)
export class RotationController {
  constructor(private readonly rotation: RotationService) {}
  @Get("next-batch/:subject/:topic")
  @Header("Cache-Control", "private, no-store")
  next(
    @Param("subject") subject: string,
    @Param("topic") topic: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.rotation.nextBatch(subject, topic, actor);
  }
}
