import { MathEngineModule } from "../math-engine/math-engine.module";
import { MathValidatorService } from "./math-validator.service";
import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { PrismaModule } from "../prisma/prisma.module";
import { CmsController } from "./cms.controller";
import { CmsService } from "./cms.service";

@Module({
  imports: [PrismaModule, AiModule, MathEngineModule],
  controllers: [CmsController],
  providers: [CmsService, MathValidatorService],
  exports: [CmsService],
})
export class CmsModule {}
