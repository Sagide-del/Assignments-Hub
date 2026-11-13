import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AcquisitionEventDto, acquisitionStages } from './dto/acquisition-event.dto';
@Injectable()
export class AcquisitionService {
  constructor(private readonly prisma: PrismaService) {}
  async ready() { await this.prisma.auditLog.count({ where: { action: 'acquisition.practice_start' } }); }
  async record(dto: AcquisitionEventDto) {
    const resource = `acquisition:${dto.session}:${dto.stage}`;
    // Reuse the existing append-only audit store, under a separate namespace.
    // Lock the random session/stage key so retries cannot count twice.
    await this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${resource}, 0))`;
      if (await tx.auditLog.findFirst({ where: { resource, action: `acquisition.${dto.stage}` }, select: { id: true } })) return;
      await tx.auditLog.create({ data: { action: `acquisition.${dto.stage}`, resource, metadata: { path: dto.path } } });
    });
  }
  async summary() {
    const since = new Date(Date.now() - 30 * 86400000);
    const [events, tuma, jenga] = await Promise.all([
      this.prisma.auditLog.groupBy({ by: ['action'], where: { action: { in: acquisitionStages.map(s=>`acquisition.${s}`) }, createdAt: { gte: since } }, _count: { _all: true } }),
      this.prisma.independentTumaPayment.findMany({ where: { status: 'CONFIRMED', paidAt: { gte: since } }, select: { studentId: true } }),
      this.prisma.independentJengaPayment.findMany({ where: { status: 'CONFIRMED', paidAt: { gte: since } }, select: { studentId: true } }),
    ]);
    return { since: since.toISOString(), stages: acquisitionStages.map(stage=>({ stage, sessions: events.find(e=>e.action===`acquisition.${stage}`)?._count._all ?? 0 })), confirmedPayingLearners: new Set([...tuma,...jenga].map(p=>p.studentId)).size };
  }
}
