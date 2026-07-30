import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthenticatedUser } from "../../auth/interfaces/authenticated-user.interface";
import { AiQuotaService } from "../ai-quota.service";

@Injectable()
export class AiQuotaGuard implements CanActivate {
  constructor(private readonly quota: AiQuotaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const actor = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>().user;
    if (!actor) throw new UnauthorizedException();

    await this.quota.assertAvailable(actor);
    return true;
  }
}
