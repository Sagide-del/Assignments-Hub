import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { Roles } from "../common/decorators/roles.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Role } from "../common/enums/role.enum";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { LibraryService } from "./library.service";
import { LibraryPdfService } from "./library-pdf.service";
@Controller("library")
export class LibraryCapabilitiesController {
  @Public() @Get("capabilities") capabilities() {
    return { studentLibraryVersion: 1, cheatSheetPdfVersion: 1 };
  }
}
@Controller("library/modules")
@Roles(Role.STUDENT)
export class LibraryDetailController {
  constructor(
    private readonly library: LibraryService,
    private readonly pdf: LibraryPdfService,
  ) {}
  @Get(":id")
  @Header("Cache-Control", "private, no-store")
  detail(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.library.detail(id, actor);
  }
  @Get(":id/cheatsheet.pdf")
  async download(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const module = await this.library.detail(id, actor);
    if (!module.theory_cheatsheet)
      throw new NotFoundException(
        "This module does not yet have a cheat sheet.",
      );
    const buffer = await this.pdf.render(module);
    res
      .set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="assignment-hub-cheatsheet-${id}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      })
      .send(buffer);
  }
}
