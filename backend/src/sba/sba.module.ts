import { SbaImportController } from "./import/import.controller";
import { SbaImportService } from "./import/import.service";
import { Module } from "@nestjs/common";
import { SbaController } from "./sba.controller";
import { SbaService } from "./sba.service";
@Module({
  controllers: [SbaController, SbaImportController],
  providers: [SbaService, SbaImportService],
})
export class SbaModule {}
