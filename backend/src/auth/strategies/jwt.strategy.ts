import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'insecure-dev-secret',
    });
  }

  /**
   * Runs on every authenticated request. We re-fetch the user (rather than
   * trusting the JWT body) so a deactivated user or deleted account is
   * rejected immediately instead of waiting for token expiry.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is no longer active');
    }

    if (user.schoolId !== payload.schoolId || user.role !== payload.role) {
      // Token no longer matches the user's current tenant/role assignment.
      throw new UnauthorizedException('Session is stale, please log in again');
    }

    return {
      id: user.id,
      schoolId: user.schoolId,
      role: user.role as AuthenticatedUser['role'],
      name: user.name,
      email: user.email,
      admissionNumber: user.admissionNumber,
      grade: user.grade,
    };
  }
}
