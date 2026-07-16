import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../audit/audit.service';
import { AUDIT_ACTION_KEY } from '../decorators/audit.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

/**
 * Writes an AuditLog row after a handler annotated with @AuditAction(...)
 * completes successfully. Applied per-route (not globally) so only
 * sensitive mutations are recorded, per Security_Model.md.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.get<string>(AUDIT_ACTION_KEY, context.getHandler());

    if (!action) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    return next.handle().pipe(
      tap((result) => {
        void this.auditService.record({
          action,
          userId: user?.id ?? null,
          schoolId: user?.schoolId ?? null,
          resource: request.params?.id ? `${request.route?.path}:${request.params.id}` : request.route?.path,
          ipAddress: request.ip,
          metadata: { method: request.method, resultId: (result as any)?.id },
        });
      }),
    );
  }
}
