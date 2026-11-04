import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { TumaPaymentsService } from "./tuma-payments.service";
@Injectable()
export class TumaCallbackQueue implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;
  private logger = new Logger(TumaCallbackQueue.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: TumaPaymentsService,
  ) {}
  onModuleInit() {
    this.timer = setInterval(
      () =>
        void this.drain().catch(() =>
          this.logger.error("Payment callback worker storage unavailable."),
        ),
      2000,
    );
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async enqueue(
    reference: string,
    token: string,
    payload: unknown,
    raw?: Buffer,
  ) {
    const payment = await this.payments.authenticateCallback(reference, token);
    // Commit the original body independently, before parsing or settlement.
    // An authenticated duplicate must never replace the first audit body.
    if (raw) {
      await this.prisma.mpesaRawCallbackEvent.createMany({
        data: [
          {
            legacy_tuma_id: payment.id,
            payload_hash: createHash("sha256").update(raw).digest("hex"),
            raw_payload: raw.toString("utf8"),
          },
        ],
        skipDuplicates: true,
      });
      await this.prisma.payment.updateMany({
        where: { legacy_tuma_id: payment.id, raw_payload: null },
        data: { raw_payload: raw.toString("utf8") },
      });
    }
    const { body } = await this.payments.validateCallback(
      reference,
      token,
      payload,
    );
    const event_key = createHash("sha256")
      .update(reference + JSON.stringify(body))
      .digest("hex");
    await this.prisma.mpesaCallbackInbox.upsert({
      where: { event_key },
      create: {
        event_key,
        reference,
        payload: body as unknown as Prisma.InputJsonObject,
      },
      update: {},
    });
  }
  async acknowledge(
    reference: string,
    token: string,
    payload: unknown,
    raw?: Buffer,
  ) {
    // Only authenticate and save an inbox row here; no invoice/access work.
    try {
      await this.enqueue(reference, token, payload, raw);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      )
        return;
      this.logger.error(
        "Callback could not be persisted; retrying locally. Pending payment requires reconciliation if this process stops.",
      );
      // Always acknowledge the provider. Never activate from an unpersisted job.
      const retry = setTimeout(
        () =>
          void this.enqueue(reference, token, payload, raw).catch(() =>
            this.logger.error(
              "Callback persistence retry failed; reconcile pending Tuma payments.",
            ),
          ),
        1000,
      );
      retry.unref();
    }
  }
  async drain() {
    if (this.running) return;
    this.running = true;
    try {
      const jobs = await this.prisma.mpesaCallbackInbox.findMany({
        where: { processed_at: null, next_attempt_at: { lte: new Date() } },
        orderBy: { created_at: "asc" },
        take: 20,
      });
      for (const job of jobs) {
        const now = new Date();
        const claimed = await this.prisma.mpesaCallbackInbox.updateMany({
          where: {
            id: job.id,
            processed_at: null,
            next_attempt_at: { lte: now },
          },
          data: {
            attempts: { increment: 1 },
            next_attempt_at: new Date(now.getTime() + 60000),
          },
        });
        if (!claimed.count) continue;
        try {
          await this.payments.processStoredCallback(job.reference, job.payload);
          await this.prisma.mpesaCallbackInbox.update({
            where: { id: job.id },
            data: { processed_at: new Date(), last_error: null },
          });
        } catch {
          await this.prisma.mpesaCallbackInbox.update({
            where: { id: job.id },
            data: {
              last_error:
                "Payment processing deferred; verify matching initiation IDs and amount.",
              next_attempt_at: new Date(
                Date.now() +
                  Math.min(600000, 2000 * 2 ** Math.min(job.attempts, 8)),
              ),
            },
          });
        }
      }
    } finally {
      this.running = false;
    }
  }
}
