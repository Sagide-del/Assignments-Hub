import { Body, Controller, Get, Post } from "@nestjs/common";
import { IsString, MaxLength, MinLength } from "class-validator";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { PracticeService } from "./practice.service";
class StartPracticeDto {
  @IsString() @MinLength(1) @MaxLength(120) subject: string;
}
@Controller("practice")
@Roles(Role.STUDENT)
export class PracticeController {
  constructor(private readonly practice: PracticeService) {}
  @Get() subjects(@CurrentUser() actor: AuthenticatedUser) {
    return this.practice.subjects(actor);
  }
  @Post() start(
    @Body() dto: StartPracticeDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.practice.start(dto.subject, actor);
  }
}
