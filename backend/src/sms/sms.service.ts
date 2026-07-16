import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { Role, SmsStatus, SmsType } from '@prisma/client';

export interface SmsRecipient {
  phone: string;
  studentId?: number;
  assignmentId?: number;
}

export interface SmsSendSummary {
  totalRecipients: number;
  sent: number;
  failed: number;
  skippedNoPhone: number;
}

// Africa's Talking is the standard SMS gateway for Kenyan platforms — cheap
// per-SMS rates, local sender-ID support, and a simple REST API. Sandbox
// (username "sandbox") and live accounts share the same request shape; only
// the host and credentials differ. See developers.africastalking.com/docs/sms/overview.
const AT_LIVE_URL = 'https://api.africastalking.com/version1/messaging';
const AT_SANDBOX_URL = 'https://api.sandbox.africastalking.com/version1/messaging';

// Africa's Talking accepts a comma-separated `to` list in a single request,
// but very large batches are best chunked so one slow/failed HTTP call
// doesn't block or lose the whole run.
const BATCH_SIZE = 100;

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiKey: string;
  private readonly username: string;
  private readonly senderId: string | undefined;
  private readonly baseUrl: string;
  private readonly enabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.apiKey = this.configService.get('AFRICASTALKING_API_KEY') || '';
    this.username = this.configService.get('AFRICASTALKING_USERNAME') || 'sandbox';
    this.senderId = this.configService.get('AFRICASTALKING_SENDER_ID') || undefined;
    this.baseUrl = this.username === 'sandbox' ? AT_SANDBOX_URL : AT_LIVE_URL;
    this.enabled = !!this.apiKey;

    if (!this.enabled) {
      this.logger.warn(
        'AFRICASTALKING_API_KEY is not set — SMS notifications will be logged as FAILED and no messages will actually send. Set it in .env to enable SMS.',
      );
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Best-effort normalization of Kenyan phone numbers to E.164 (+254...).
  // Accepts "0712345678", "712345678", "254712345678", or an already
  // correctly formatted "+254712345678" and leaves anything else untouched
  // so non-Kenyan numbers aren't mangled.
  normalizePhone(raw: string): string | null {
    if (!raw) return null;
    const digits = raw.trim().replace(/[\s-]/g, '');
    if (/^\+254\d{9}$/.test(digits)) return digits;
    if (/^254\d{9}$/.test(digits)) return `+${digits}`;
    if (/^0\d{9}$/.test(digits)) return `+254${digits.slice(1)}`;
    if (/^\d{9}$/.test(digits)) return `+254${digits}`;
    if (/^\+\d{8,15}$/.test(digits)) return digits; // already international, non-KE
    return null;
  }

  /**
   * Sends one message to a list of recipients, logging one SmsLog row per
   * recipient (skips recipients with no/invalid phone). Never throws — a
   * failed or misconfigured SMS gateway should never break the assignment
   * submission / creation flow it's attached to.
   */
  async sendAndLog(params: {
    schoolId: number;
    type: SmsType;
    message: string;
    recipients: SmsRecipient[];
    sentById?: number;
  }): Promise<SmsSendSummary> {
    const { schoolId, type, message, recipients, sentById } = params;
    const summary: SmsSendSummary = { totalRecipients: recipients.length, sent: 0, failed: 0, skippedNoPhone: 0 };

    const valid: (SmsRecipient & { normalizedPhone: string })[] = [];
    for (const r of recipients) {
      const normalizedPhone = this.normalizePhone(r.phone);
      if (!normalizedPhone) {
        summary.skippedNoPhone++;
        continue;
      }
      valid.push({ ...r, normalizedPhone });
    }

    if (valid.length === 0) return summary;

    if (!this.enabled) {
      // Log every recipient as FAILED so the school admin can see *why*
      // nothing went out (missing gateway credentials) rather than silence.
      await this.prisma.smsLog.createMany({
        data: valid.map((r) => ({
          schoolId,
          type,
          toPhone: r.normalizedPhone,
          message,
          status: SmsStatus.FAILED,
          errorMessage: 'SMS gateway not configured (AFRICASTALKING_API_KEY missing)',
          studentId: r.studentId,
          assignmentId: r.assignmentId,
          sentById,
        })),
      });
      summary.failed = valid.length;
      return summary;
    }

    for (let i = 0; i < valid.length; i += BATCH_SIZE) {
      const batch = valid.slice(i, i + BATCH_SIZE);
      await this.sendBatch(batch, message, schoolId, type, sentById, summary);
    }

    return summary;
  }

  private async sendBatch(
    batch: (SmsRecipient & { normalizedPhone: string })[],
    message: string,
    schoolId: number,
    type: SmsType,
    sentById: number | undefined,
    summary: SmsSendSummary,
  ) {
    const byPhone = new Map(batch.map((r) => [r.normalizedPhone, r]));

    try {
      const body = new URLSearchParams();
      body.set('username', this.username);
      body.set('to', batch.map((r) => r.normalizedPhone).join(','));
      body.set('message', message);
      if (this.senderId) body.set('from', this.senderId);

      const response = await axios.post(this.baseUrl, body.toString(), {
        headers: {
          apiKey: this.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      });

      // Documented shape: { SMSMessageData: { Message, Recipients: [{ number, status, statusCode, cost, messageId }] } }
      const atRecipients: any[] = response.data?.SMSMessageData?.Recipients || [];
      const logRows = atRecipients.map((rec) => {
        const match = byPhone.get(rec.number);
        const success = rec.status === 'Success' || rec.statusCode === 101 || rec.statusCode === 100;
        if (success) summary.sent++;
        else summary.failed++;
        return {
          schoolId,
          type,
          toPhone: rec.number,
          message,
          status: success ? SmsStatus.SENT : SmsStatus.FAILED,
          errorMessage: success ? undefined : rec.status || 'Unknown gateway error',
          studentId: match?.studentId,
          assignmentId: match?.assignmentId,
          sentById,
        };
      });

      // If the gateway returned fewer recipient rows than we sent (shouldn't
      // normally happen), account for the rest as failed so summary counts
      // never silently drop recipients.
      const accountedFor = new Set(atRecipients.map((r) => r.number));
      for (const r of batch) {
        if (!accountedFor.has(r.normalizedPhone)) {
          summary.failed++;
          logRows.push({
            schoolId,
            type,
            toPhone: r.normalizedPhone,
            message,
            status: SmsStatus.FAILED,
            errorMessage: 'No delivery status returned by gateway',
            studentId: r.studentId,
            assignmentId: r.assignmentId,
            sentById,
          });
        }
      }

      if (logRows.length) await this.prisma.smsLog.createMany({ data: logRows as any });
    } catch (error: any) {
      this.logger.error('Africa\'s Talking send failed:', error.response?.data || error.message);
      summary.failed += batch.length;
      await this.prisma.smsLog.createMany({
        data: batch.map((r) => ({
          schoolId,
          type,
          toPhone: r.normalizedPhone,
          message,
          status: SmsStatus.FAILED,
          errorMessage: (error.response?.data?.SMSMessageData?.Message || error.message || 'Send failed').toString().slice(0, 500),
          studentId: r.studentId,
          assignmentId: r.assignmentId,
          sentById,
        })),
      });
    }
  }

  // ==================== HIGH-LEVEL NOTIFICATION HELPERS ====================

  /** Fire-and-forget from SubmissionsService.create() — never awaited by the caller. */
  async notifyAssignmentCompleted(params: {
    schoolId: number;
    studentId: number;
    studentName: string;
    parentPhone: string | null | undefined;
    assignmentTitle: string;
    assignmentId: number;
    completedAt: Date;
  }) {
    if (!params.parentPhone) return; // no parent contact on file — nothing to do
    const dateStr = params.completedAt.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = params.completedAt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    const message = `Assignments Hub: ${params.studentName} completed "${params.assignmentTitle}" on ${dateStr} at ${timeStr}. Well done!`;

    return this.sendAndLog({
      schoolId: params.schoolId,
      type: SmsType.ASSIGNMENT_COMPLETED,
      message,
      recipients: [{ phone: params.parentPhone, studentId: params.studentId, assignmentId: params.assignmentId }],
    });
  }

  /** Called when a teacher publishes/creates an assignment with notifyParents=true. */
  async notifyNewAssignment(params: {
    schoolId: number;
    assignmentId: number;
    assignmentTitle: string;
    subject: string;
    grade: string;
    dueDate?: Date | null;
    recipients: SmsRecipient[];
    sentById: number;
  }) {
    const dueStr = params.dueDate
      ? ` Due ${params.dueDate.toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })}.`
      : '';
    const message = `Assignments Hub: A new ${params.subject} assignment "${params.assignmentTitle}" was posted for ${params.grade}.${dueStr} Ask your child to log in and complete it.`;

    return this.sendAndLog({
      schoolId: params.schoolId,
      type: SmsType.NEW_ASSIGNMENT,
      message,
      recipients: params.recipients,
      sentById: params.sentById,
    });
  }

  /** Mass/broadcast SMS composed by a School Admin or Teacher. */
  async broadcast(params: {
    schoolId: number;
    message: string;
    recipients: SmsRecipient[];
    sentById: number;
  }) {
    return this.sendAndLog({
      schoolId: params.schoolId,
      type: SmsType.BROADCAST,
      message: params.message,
      recipients: params.recipients,
      sentById: params.sentById,
    });
  }

  /** Every active student in the school (optionally filtered by grade) who has a parent phone on file. */
  async getStudentRecipients(schoolId: number, grade?: string): Promise<SmsRecipient[]> {
    const students = await this.prisma.user.findMany({
      where: {
        schoolId,
        role: Role.STUDENT,
        isActive: true,
        parentPhone: { not: null },
        ...(grade ? { grade } : {}),
      },
      select: { id: true, parentPhone: true },
    });
    return students
      .filter((s) => !!s.parentPhone)
      .map((s) => ({ phone: s.parentPhone as string, studentId: s.id }));
  }

  /** Recent SMS send history for a school, newest first — used by the School Admin messaging tab. */
  async getLogs(schoolId: number, take = 100) {
    return this.prisma.smsLog.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        student: { select: { id: true, name: true, grade: true } },
        sentBy: { select: { id: true, name: true } },
      },
    });
  }
}
