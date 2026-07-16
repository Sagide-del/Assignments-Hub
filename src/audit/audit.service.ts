import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  action: string;
  userId?: number | null;
  schoolId?: number | null;
  resource?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Central audit logging (Security_Model.md: "Audit logging"). Failures to
 * write an audit record must never break the request that triggered them,
 * so writes are best-effort and logged locally on failure.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          userId: entry.userId ?? null,
          schoolId: entry.schoolId ?? null,
          resource: entry.resource,
          metadata: entry.metadata as any,
          ipAddress: entry.ipAddress,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to write audit log for action "${entry.action}"`, err as Error);
    }
  }
}
