import { blogPaymentReport } from './landing-source';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AcquisitionEventDto, acquisitionStages } from './dto/acquisition-event.dto';
@Injectable()
export class AcquisitionService {
  constructor(private readonly prisma: PrismaService) {}
  async ready() { await this.prisma.auditLog.count({ where: { action: 'acquisition.practice_start' } }); await this.prisma.user.count({where:{landing_source:'blog/csl-ideas-for-students'}}); await this.prisma.independentTumaPayment.count({where:{landing_source:'blog/csl-ideas-for-students'}}); await this.prisma.independentJengaPayment.count({where:{landing_source:'blog/csl-ideas-for-students'}}); await this.prisma.payment.count({where:{landing_source:'blog/csl-ideas-for-students'}}); }
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
    const [events, tuma, jenga, registrations] = await Promise.all([
      this.prisma.auditLog.groupBy({ by: ['action'], where: { action: { in: acquisitionStages.map(s=>`acquisition.${s}`) }, createdAt: { gte: since } }, _count: { _all: true } }),
      this.prisma.independentTumaPayment.findMany({ where: { status: 'CONFIRMED', paidAt: { gte: since } }, select: { studentId: true, landing_source: true, amountKES: true } }),
      this.prisma.independentJengaPayment.findMany({ where: { status: 'CONFIRMED', paidAt: { gte: since } }, select: { studentId: true, landing_source: true, amountKES: true } }),
      this.prisma.user.groupBy({by:['landing_source'],where:{role:'STUDENT',school:{code:'INDEPENDENT'},createdAt:{gte:since}},_count:{_all:true}}),
    ]);
    return { blogAttribution: blogPaymentReport(registrations, [...tuma,...jenga]), attributionModel:'First blog touch stored in a 30-day first-party cookie; confirmed payments in the last 30 days. This includes renewals and does not establish organic-search causation.', since: since.toISOString(), stages: acquisitionStages.map(stage=>({ stage, sessions: events.find(e=>e.action===`acquisition.${stage}`)?._count._all ?? 0 })), confirmedPayingLearners: new Set([...tuma,...jenga].map(p=>p.studentId)).size };
  }
}
