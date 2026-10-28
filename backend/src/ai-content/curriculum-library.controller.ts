import { Public } from "../common/decorators/public.decorator";
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AiFeature } from "@prisma/client";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { RequiresAiFeature } from "./decorators/ai-feature.decorator";
import { AiFeatureGuard } from "./guards/ai-feature.guard";
import { CurriculumLibraryService } from "./curriculum-library.service";
import {
  PopulateCurriculumDto,
  PublishCurriculumDto,
} from "./dto/populate-curriculum.dto";
@Controller("ai/curriculum")
@Roles(Role.PLATFORM_ADMIN)
@RequiresAiFeature(AiFeature.ASSIGNMENT_DRAFT)
@UseGuards(AiFeatureGuard)
export class CurriculumLibraryController {
  constructor(private readonly library: CurriculumLibraryService) {}
  @Get() documents(@CurrentUser() actor: AuthenticatedUser) {
    return this.library.documents(actor);
  }
  @Get(":id") coverage(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.library.coverage(id, actor);
  }
  @Post(":id/populate") populate(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: PopulateCurriculumDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.library.populate(id, dto, actor);
  }
  @Post(":id/publish") publish(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: PublishCurriculumDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.library.publish(id, dto, actor);
  }
}

@Controller("ai")
export class CurriculumCapabilitiesController {
  @Get("curriculum-capabilities") @Public() capabilities() {
    return {
      curriculumLibraryVersion: 1,
      reviewRequired: true,
      independentPublishing: true,
    };
  }
}
