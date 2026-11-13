import { Body, Controller, Get, Post, Header } from "@nestjs/common";
import {
  IsIn,
  IsString,
  MinLength,
  MaxLength,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsObject,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { Roles } from "../../common/decorators/roles.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { Role } from "../../common/enums/role.enum";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../auth/interfaces/authenticated-user.interface";
import { PrismaService } from "../../prisma/prisma.service";
import { SportsLabService } from "./sports.service";
import { SPORTS_IDS, SportsId, SportsSubmission } from "./sports-engine";
class ObservationDto {
  @IsObject() config: Record<string, number>;
  @IsString() @MinLength(12) @MaxLength(600) note: string;
}
export class SportsCompleteDto implements SportsSubmission {
  @IsIn(SPORTS_IDS) simulation: SportsId;
  @IsString() @MinLength(12) @MaxLength(600) prediction: string;
  @IsString() @MinLength(30) @MaxLength(2000) conclusion: string;
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => ObservationDto)
  observations: ObservationDto[];
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(3, { each: true })
  answers: number[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  inspected?: string[];
}
@Controller("student/sports-lab")
export class SportsLabController {
  constructor(
    private readonly service: SportsLabService,
    private readonly db: PrismaService,
  ) {}
  @Get("capabilities") @Public() async capabilities() {
    await this.db.sports_Lab_Progress.findFirst({ select: { id: true } });
    return {
      ready: true,
      version: 1,
      simulations: 5,
      demoReady: await this.service.demoReady(),
    };
  }
  @Get("activities")
  @Roles(Role.STUDENT)
  @Header("Cache-Control", "private,no-store")
  activities(@CurrentUser() a: AuthenticatedUser) {
    return this.service.activities(a);
  }
  @Get("progress")
  @Roles(Role.STUDENT)
  @Header("Cache-Control", "private,no-store")
  progress(@CurrentUser() a: AuthenticatedUser) {
    return this.service.progress(a);
  }
  @Post("complete") @Roles(Role.STUDENT) complete(
    @Body() p: SportsCompleteDto,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.service.complete(p, a);
  }
}
