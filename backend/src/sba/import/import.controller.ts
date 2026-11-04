import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { Response } from "express";
import { Roles } from "../../common/decorators/roles.decorator";
import { Role } from "../../common/enums/role.enum";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../auth/interfaces/authenticated-user.interface";
import { SbaImportService } from "./import.service";
import { ImportMocksDto } from "./import.dto";
@Controller("sba/import")
@Roles(Role.SCHOOL_ADMIN)
export class SbaImportController {
  constructor(private readonly service: SbaImportService) {}
  @Get("template") async template(
    @CurrentUser() actor: AuthenticatedUser,
    @Res() res: Response,
  ) {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="external-mocks-template.csv"',
    );
    res.send(await this.service.template(actor));
  }
  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 2 },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportMocksDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.upload(file, dto, actor);
  }
  @Post("merge") merge(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.merge(actor);
  }
}
