import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AiFeature } from "@prisma/client";
import { AuthenticatedUser } from "../../auth/interfaces/authenticated-user.interface";
import { AI_FEATURE_KEY } from "../decorators/ai-feature.decorator";
import { AiFeatureConfigService } from "../ai-feature-config.service";

@Injectable()
export class AiFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureConfig: AiFeatureConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const actor = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>().user;
    if (!actor) throw new UnauthorizedException();

    const feature =
      this.reflector.getAllAndOverride<AiFeature>(AI_FEATURE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? AiFeature.ASSIGNMENT_DRAFT;

    await this.featureConfig.assertEnabled(actor, feature);
    return true;
  }
}
