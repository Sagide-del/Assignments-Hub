import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '../enums/role.enum';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

/**
 * Tenant data isolation (Security_Model.md: "A school can only access its
 * own records"). Any route that accepts a `schoolId` — as a route param,
 * query param, or in the request body — must resolve to the caller's own
 * school, unless the caller is PLATFORM_ADMIN.
 *
 * This guard only checks the *transport-level* schoolId. Services must
 * still scope every Prisma query with `where: { schoolId: user.schoolId }`
 * (see BaseTenantService) — this guard is a second, independent layer, not
 * a substitute for query-level scoping.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    if (!user) {
      // No authenticated user yet — let JwtAuthGuard handle rejection.
      return true;
    }

    if (user.role === Role.PLATFORM_ADMIN) {
      return true;
    }

    const candidateSchoolId =
      request.params?.schoolId ?? request.query?.schoolId ?? request.body?.schoolId;

    if (candidateSchoolId === undefined || candidateSchoolId === null) {
      // Route doesn't reference a specific school explicitly; the service
      // layer is responsible for scoping by user.schoolId.
      return true;
    }

    if (Number(candidateSchoolId) !== user.schoolId) {
      throw new ForbiddenException('You cannot access another school\'s data');
    }

    return true;
  }
}
