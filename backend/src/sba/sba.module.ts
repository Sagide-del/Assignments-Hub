import { Module } from "@nestjs/common";
import { SbaController } from "./sba.controller";
import { SbaService } from "./sba.service";
@Module({ controllers: [SbaController], providers: [SbaService] })
export class SbaModule {}
