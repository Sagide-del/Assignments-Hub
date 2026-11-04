import {
  Header,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { Response } from "express";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { TeacherScopeGuard } from "../teacher-scope/teacher-scope.guard";
import { CslPhotoService } from "./csl-photo.service";
import { CslService } from "./csl.service";
import { CslPdfService } from "./csl-pdf.service";
import { LogCslDto, RejectCslDto } from "./csl.dto";
@Controller("csl")
@UseGuards(TeacherScopeGuard)
export class CslController {
  constructor(
    private readonly csl: CslService,
    private readonly pdf: CslPdfService,
    private readonly photos: CslPhotoService,
  ) {}
  @Get("capabilities") @Public() capabilities() {
    return this.csl.capabilities();
  }
  @Post("storage-check")
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN)
  storageCheck(@CurrentUser() actor: AuthenticatedUser) {
    return this.photos.verifyStorage(actor.schoolId, actor.id);
  }
  @Post("log")
  @Roles(Role.STUDENT)
  @UseInterceptors(
    FileInterceptor("photo", {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5 },
    }),
  )
  log(
    @Body() dto: LogCslDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.csl.log(dto, file, actor);
  }
  @Get("my-hours")
  @Header("Cache-Control", "private, no-store")
  @Roles(Role.STUDENT)
  myHours(@CurrentUser() actor: AuthenticatedUser) {
    return this.csl.myHours(actor);
  }
  @Get("pending")
  @Header("Cache-Control", "private, no-store")
  @Roles(Role.TEACHER)
  pending(@CurrentUser() actor: AuthenticatedUser) {
    return this.csl.pending(actor);
  }
  @Patch(":id/approve") @Roles(Role.TEACHER) approve(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.csl.review(id, true, undefined, actor);
  }
  @Patch(":id/reject") @Roles(Role.TEACHER) reject(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RejectCslDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.csl.review(id, false, dto.comment, actor);
  }
  @Get(":student_id/logbook-pdf")
  @Roles(Role.STUDENT, Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
  async logbook(
    @Param("student_id", ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const data = await this.csl.pdfData(id, actor),
      pdf = await this.pdf.render(data);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="csl-logbook-${id}.pdf"`,
    );
    res.setHeader("Cache-Control", "private, no-store");
    res.send(pdf);
  }
}
