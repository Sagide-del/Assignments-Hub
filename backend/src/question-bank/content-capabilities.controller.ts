import { readFile } from "fs/promises";
import { resolve } from "path";
import snapshotManifest from "./github-curriculum.manifest.json";
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
      await this.prisma.questionGenerationBatch.count();
      await this.prisma.questionBank.findFirst({ select: { batchId: true } });
      await this.prisma.curriculumScope.count();
      await this.prisma.collectionAsset.count();
      const snapshot = JSON.parse(
        await readFile(
          resolve(process.cwd(), "dist/curriculum-data/snapshot.json"),
          "utf8",
        ),
      );
      if (
        snapshot.commit !== snapshotManifest.commit ||
        snapshot.files.length !== snapshotManifest.files.length
      )
        throw Error("Curriculum snapshot is not ready");
      return {
        centralContentVersion: 3,
        practiceBatchSize: 30,
        savedQuestionLibrary: true,
        numberedQuestionBatches: true,
        questionPublication: true,
        nativeRecallCards: true,
        gradeLevels: [6, 7, 8, 9, 10, 11, 12],
        bulkCurriculum: true,
        collectionIngestion: true,
        outcomeGrounding: true,
        officialCurriculumImport: true,
        embeddedCurriculumDiscovery: true,
        publicDownloadConfirmation: true,
        automaticGradePreparation:true,
        repositoryCurriculumSnapshot: snapshotManifest.commit,
      };
    } catch {
      throw new ServiceUnavailableException(
        "Content library migrations are not ready.",
      );
    }
  }
}
