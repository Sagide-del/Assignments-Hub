import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';

/**
 * Restrict an endpoint to the given roles.
 * Must be paired with JwtAuthGuard + RolesGuard on the controller/route.
 *
 * @example @Roles(Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
