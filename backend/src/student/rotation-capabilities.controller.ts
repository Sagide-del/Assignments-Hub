import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { PrismaService } from "../prisma/prisma.service";
@Controller("student")
export class RotationCapabilitiesController {
  constructor(private readonly db: PrismaService) {}
  @Get("rotation-capabilities") @Public() async capabilities() {
    await this.db.masterModule.findFirst({
      where: { id: "__rotation_probe__" },
      select: { batch_number: true, theory_cheatsheet: true },
    });
    const rows = await this.db.$queryRaw<
      { ready: boolean }[]
    >`SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='MasterModule_assign_batch_number' AND NOT tgisinternal) AND EXISTS(SELECT 1 FROM pg_indexes WHERE indexname='MasterModule_topic_batch_key') AS ready`;
    if (!rows[0]?.ready)
      throw new ServiceUnavailableException(
        "Apply the cheat-sheet and batch rotation migration.",
      );
    return { cheatsheetVersion: 1, rotationVersion: 1 };
  }
}
