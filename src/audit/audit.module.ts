import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditService } from './audit.service';
import { AuditLogInterceptor } from '../common/interceptors/audit-log.interceptor';

@Global()
@Module({
  providers: [
    AuditService,
    // Global no-op unless a route is tagged with @AuditAction(...).
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
  exports: [AuditService],
})
export class AuditModule {}
