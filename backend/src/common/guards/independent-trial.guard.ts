import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { ALLOW_INDEPENDENT_TRIAL_KEY } from '../decorators/allow-independent-trial.decorator';

/**
 * A trial is deliberately narrow: learners can work through their one
 * starter assignment but cannot use the wider learning workspace until a
 * payment is approved. The guard makes direct API calls obey the same rule
 * as the frontend navigation.
 */
@Injectable()
export class IndependentTrialGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    if (!user?.isIndependentTrial) return true;

    const allowed = this.reflector.getAllAndOverride<boolean>(ALLOW_INDEPENDENT_TRIAL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowed) return true;

    throw new ForbiddenException('Your trial includes one starter assignment. Activate your account to unlock the full learning workspace.');
  }
}
