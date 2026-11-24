import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { timingSafeEqual } from "crypto";
// API contract: IntaSend's official intasend-python collections.py/client.py.
@Injectable()
export class IntasendStkProvider {
  constructor(private readonly config: ConfigService) {}
  isLive() {
    return this.config.get("INTASEND_TEST_MODE") === "false";
  }
  isConfigured() {
    const live = this.isLive(),
      suffix = live ? "live_" : "test_";
    return (
      this.config.get("INTASEND_ENABLED") === "true" &&
      !!this.config.get("INTASEND_WEBHOOK_SECRET") &&
      String(this.config.get("INTASEND_PUBLISHABLE_KEY") || "").startsWith(
        "ISPubKey_" + suffix,
      ) &&
      String(this.config.get("INTASEND_SECRET_KEY") || "").startsWith(
        "ISSecretKey_" + suffix,
      ) &&
      (this.config.get("NODE_ENV") !== "production" || live)
    );
  }
  private url() {
    return this.isLive()
      ? "https://payment.intasend.com/api/v1"
      : "https://sandbox.intasend.com/api/v1";
  }
  private headers() {
    return {
      Authorization: `Bearer ${this.config.get("INTASEND_SECRET_KEY")}`,
      INTASEND_PUBLIC_API_KEY: this.config.get("INTASEND_PUBLISHABLE_KEY"),
      "Content-Type": "application/json",
    };
  }
  assertEnabled() {
    if (!this.isConfigured())
      throw new ServiceUnavailableException(
        "IntaSend payments are not configured. Contact support before paying.",
      );
  }
  validChallenge(payload: unknown) {
    const s = String(this.config.get("INTASEND_WEBHOOK_SECRET") || ""),
      p = payload as { challenge?: unknown };
    if (!s || typeof p?.challenge !== "string") return false;
    const a = Buffer.from(s),
      b = Buffer.from(p.challenge);
    return a.length === b.length && timingSafeEqual(a, b);
  }
  async initiate(input: {
    amount: number;
    phone: string;
    reference: string;
    name: string;
    email?: string | null;
  }) {
    this.assertEnabled();
    if (!Number.isInteger(input.amount) || input.amount <= 0)
      throw new BadGatewayException("Invalid payment amount.");
    try {
      const r = await axios.post(
        `${this.url()}/payment/mpesa-stk-push/`,
        {
          public_key: this.config.get("INTASEND_PUBLISHABLE_KEY"),
          currency: "KES",
          method: "M-PESA",
          amount: input.amount,
          phone_number: input.phone,
          api_ref: input.reference,
          name: input.name,
          ...(input.email ? { email: input.email } : {}),
          narrative: "AssignmentHub",
        },
        { headers: this.headers(), timeout: 20000 },
      );
      const id = r.data?.invoice?.invoice_id;
      if (typeof id !== "string" || !id || id.length > 120)
        throw Error("Missing invoice identifier");
      return { invoiceId: id };
    } catch {
      throw new BadGatewayException(
        "The M-Pesa request could not be confirmed. Check your phone and payment status before trying again.",
      );
    }
  }
  async status(invoiceId: string) {
    this.assertEnabled();
    try {
      const r = await axios.post(
        `${this.url()}/payment/status/`,
        {
          invoice_id: invoiceId,
          public_key: this.config.get("INTASEND_PUBLISHABLE_KEY"),
        },
        { headers: this.headers(), timeout: 15000 },
      );
      return r.data;
    } catch {
      throw new BadGatewayException(
        "IntaSend payment status is temporarily unavailable.",
      );
    }
  }
}
