// UNUSED — replaced by common/guards/jwt-auth.guard.ts (JwtAuthGuard), which
// is what's registered as the global APP_GUARD in app.module.ts.
//
// This guard only decoded the raw JWT payload ({ sub, schoolId, role }) onto
// req.user, so every @CurrentUser() consumer expecting the full
// AuthenticatedUser shape (id, name, email, admissionNumber, grade) — which
// is all of them — got `actor.id === undefined` and friends. It also never
// re-checked whether the account was still active. Kept only because this
// environment can't delete files; safe to delete, do not re-register it.
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'change-this-to-a-long-random-secret',
      });
      
      request['user'] = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}