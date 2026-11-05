import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MathEngineService } from "./math-engine.service";
import { Controller, Get } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
@Controller("student")
class MathCapabilitiesController {
  constructor(private readonly engine: MathEngineService) {}
  @Public() @Get("math-capabilities") health() {
    return this.engine.health();
  }
}
@Module({
  imports: [ConfigModule],
  providers: [MathEngineService],
  controllers: [MathCapabilitiesController],
  exports: [MathEngineService],
})
export class MathEngineModule {}
