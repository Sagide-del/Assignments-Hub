import { Module } from "@nestjs/common";
import { MatcherController } from "./matcher.controller";
import { MatcherService } from "./matcher.service";
import { CareerDecisionBriefService } from "./career-decision-brief.service";
@Module({ controllers: [MatcherController], providers: [MatcherService, CareerDecisionBriefService] })
export class CareerModule {}
