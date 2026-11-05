import { Body, Controller, Get, Post, Query, Header } from "@nestjs/common";
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { Roles } from "../common/decorators/roles.decorator";
import { Public } from "../common/decorators/public.decorator";
import { AllowIndependentTrial } from "../common/decorators/allow-independent-trial.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { SubjectEnrollmentService } from "./subject-enrollment.service";
class SubjectsDto {
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  elective_subjects: string[];
  @IsOptional() @IsInt() @Min(1) track_id?: number;
}
@Controller("student")
export class SubjectEnrollmentController {
  constructor(private readonly enrollment: SubjectEnrollmentService) {}
  @Get("assignment-capabilities") @Public() async capabilities() {
    return this.enrollment.capabilities();
  }
  @Get("subject-options") @Public() options(@Query("grade") grade: string) {
    return this.enrollment.options(Number(grade));
  }
  @Header("Cache-Control","private, no-store")
  @Get("subjects") @Roles(Role.STUDENT) @AllowIndependentTrial() current(
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.enrollment.current(a.id, a.schoolId);
  }
  @Header("Cache-Control","private, no-store")
  @Post("subjects") @Roles(Role.STUDENT) @AllowIndependentTrial() save(
    @CurrentUser() a: AuthenticatedUser,
    @Body() dto: SubjectsDto,
  ) {
    return this.enrollment.save(
      a.id,
      a.schoolId,
      dto.elective_subjects,
      dto.track_id,
    );
  }
}
