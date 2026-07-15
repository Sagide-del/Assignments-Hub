import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'auditAction';

/**
 * Tags a route handler so AuditLogInterceptor records an AuditLog row on
 * success. @example @AuditAction('user.create')
 */
export const AuditAction = (action: string) => SetMetadata(AUDIT_ACTION_KEY, action);
