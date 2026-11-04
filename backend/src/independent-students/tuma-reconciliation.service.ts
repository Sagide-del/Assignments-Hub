import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { TumaPaymentProvider } from "./tuma-payment.provider";
import { TumaPaymentsService } from "./tuma-payments.service";

@Injectable()
export class TumaReconciliationService {
  private readonly logger = new Logger(TumaReconciliationService.name);
  private running = false;
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: TumaPaymentProvider,
    private readonly payments: TumaPaymentsService,
  ) {}

  @Cron("0 */15 * * * *", { name: "tuma-payment-reconciliation" })
  async reconcile() {
    if (this.running) return;
    this.running = true;
    try {
      const now = new Date();
      const pending = await this.prisma.payment.findMany({
        where: {
          status: "PENDING",
          created_at: { lt: new Date(now.getTime() - 15 * 60000) },
          reconciliation_after: { lte: now },
        },
        orderBy: [{ reconciliation_after: "asc" }, { created_at: "asc" }],
        take: 100,
      });
      if (!pending.length) return;
      if (!this.provider.statusQueryConfigured()) {
        this.logger.error(
          "Tuma reconciliation unavailable: transaction-status API contract required. Pending payments remain unchanged; verify with Tuma manually.",
        );
        return;
      }
      for (const payment of pending) {
        // A persisted lease prevents duplicate work across backend replicas.
        const claimed = await this.prisma.payment.updateMany({
          where: {
            id: payment.id,
            status: "PENDING",
            reconciliation_after: { lte: now },
          },
          data: { reconciliation_after: new Date(now.getTime() + 15 * 60000) },
        });
        if (!claimed.count) continue;
        if (!payment.checkout_request_id) {
          this.logger.warn(
            `Payment ${payment.id} requires manual verification: missing CheckoutRequestID.`,
          );
          continue;
        }
        try {
          // The provider adapter must return a documented, validated canonical
          // callback payload, including real amount, receipt and request IDs.
          const result = await this.provider.queryTransactionStatus(
            payment.checkout_request_id,
          );
          const order =
            await this.prisma.independentTumaPayment.findUniqueOrThrow({
              where: { id: payment.legacy_tuma_id },
            });
          // Reuse the atomic callback path: account lock, ID/amount checks,
          // receipt uniqueness, invoice and subscription update in one transaction.
          await this.payments.processStoredCallback(
            order.reference,
            result.payload,
          );
          const settled = await this.prisma.payment.findUniqueOrThrow({
            where: { id: payment.id },
          });
          if (settled.status === "SUCCESS")
            this.logger.warn(
              `Reconciled payment ${payment.id} via status query due to missing callback.`,
            );
          else if (
            settled.status === "FAILED" ||
            settled.status === "CANCELLED"
          )
            this.logger.log(
              `Reconciled payment ${payment.id}: ${settled.status}.`,
            );
        } catch {
          // Never infer failure or success from a timeout/malformed response.
          this.logger.error(
            `Payment ${payment.id} status verification deferred; retry scheduled.`,
          );
        }
      }
    } catch {
      this.logger.error(
        "Tuma reconciliation storage unavailable; will retry on the next scheduled run.",
      );
    } finally {
      this.running = false;
    }
  }
}
