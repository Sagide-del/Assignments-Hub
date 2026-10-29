import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { PrismaService } from "../prisma/prisma.service";
@Controller("content-library")
export class ContentCapabilitiesController {
  constructor(private readonly prisma: PrismaService) {}
  @Get("capabilities") @Public() async capabilities() {
    try {
      await this.prisma.contentLibraryJob.count();
      await this.prisma.mnemonicCard.findFirst({
        select: { content: true, sourceDocumentId: true },
      });
      return {
        centralContentVersion: 1,
        practiceBatchSize: 30,
        nativeRecallCards: true,
        officialCurriculumImport: true,
      };
    } catch {
      throw new ServiceUnavailableException(
        "Content library migrations are not ready.",
      );
    }
  }
}
