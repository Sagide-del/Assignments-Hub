import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { EarlyYearsController } from './early-years.controller';
import { EarlyYearsService } from './early-years.service';

@Module({ imports: [AiModule], controllers: [EarlyYearsController], providers: [EarlyYearsService] })
export class EarlyYearsModule {}
