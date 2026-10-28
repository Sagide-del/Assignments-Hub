import {
  Injectable,
  ServiceUnavailableException,
  BadGatewayException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
export function normalizeMpesaPhone(value: string) {
  const digits = value.replace(/[\s()+-]/g, "");
  const match = digits.match(/^(?:254|0)?([17]\d{8})$/);
  return match ? `254${match[1]}` : null;
}
export class TumaRequestRejectedException extends BadGatewayException {
  constructor() {
    super(
      "The M-Pesa request was declined. Please check the phone number or try again later.",
    );
  }
}
@Injectable()
export class TumaPaymentProvider {
  private token: string | null = null;
  private expires = 0;
  private authenticating: Promise<string> | null = null;
  constructor(private readonly config: ConfigService) {}
  isConfigured() {
    return Boolean(
      this.config.get<string>("TUMA_API_KEY")?.trim() &&
      this.config.get<string>("TUMA_BUSINESS_EMAIL")?.trim() &&
      this.callbackBase(),
    );
  }
  callbackBase() {
    const value = this.config.get<string>("TUMA_CALLBACK_BASE_URL")?.trim();
    if (!value) return null;
    try {
      const u = new URL(value);
      return u.protocol === "https:" &&
        !u.search &&
        !u.hash &&
        u.pathname.endsWith("/independent-students/tuma/callback")
        ? u.toString().replace(/\/$/, "")
        : null;
    } catch {
      return null;
    }
  }
  private async accessToken() {
    if (this.token && Date.now() < this.expires) return this.token;
    if (this.authenticating) return this.authenticating;
    this.authenticating = (async () => {
      try {
        const { data } = await axios.post(
          "https://api.tuma.co.ke/auth/token",
          {
            email: this.config.get<string>("TUMA_BUSINESS_EMAIL")?.trim(),
            api_key: this.config.get<string>("TUMA_API_KEY")?.trim(),
          },
          { timeout: 15000, maxRedirects: 0 },
        );
        const token = data?.token ?? data?.data?.token;
        if (data?.success !== true || typeof token !== "string" || !token)
          throw Error("Invalid authentication");
        this.token = token;
        const seconds = Number(
          data.expires_in ?? data.data?.expires_in ?? 3600,
        );
        this.expires =
          Date.now() +
          (Number.isFinite(seconds) && seconds > 120
            ? Math.min(seconds - 60, 82800)
            : 60) *
            1000;
        return token;
      } catch {
        throw new ServiceUnavailableException(
          "M-Pesa connection is unavailable. Please try again later.",
        );
      } finally {
        this.authenticating = null;
      }
    })();
    return this.authenticating;
  }
  async initiate(input: {
    amount: number;
    phone: string;
    callbackUrl: string;
    reference: string;
  }) {
    if (!this.isConfigured())
      throw new ServiceUnavailableException(
        "M-Pesa payments are not configured yet.",
      );
    const token = await this.accessToken();
    try {
      const { data } = await axios.post(
        "https://api.tuma.co.ke/payment/stk-push",
        {
          amount: input.amount,
          phone: input.phone,
          callback_url: input.callbackUrl,
          description: "AssignmentHub",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 25000,
          maxRedirects: 0,
        },
      );
      if (data?.success === false) throw new TumaRequestRejectedException();
      if (data?.success !== true)
        throw new BadGatewayException("Unexpected payment response.");
      const d = data.data;
      if (
        typeof d?.checkout_request_id !== "string" ||
        !d.checkout_request_id ||
        typeof d?.merchant_request_id !== "string" ||
        !d.merchant_request_id
      )
        throw new BadGatewayException(
          "The payment provider did not return request identifiers.",
        );
      return {
        checkoutRequestId: d.checkout_request_id,
        merchantRequestId: d.merchant_request_id,
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        this.token = null;
        this.expires = 0;
      }
      if (
        axios.isAxiosError(error) &&
        [400, 401, 403, 404, 422, 429].includes(error.response?.status ?? 0)
      )
        throw new TumaRequestRejectedException();
      if (error instanceof BadGatewayException) throw error;
      throw new BadGatewayException(
        "The payment request could not be confirmed. Check your phone and payment status before trying again.",
      );
    }
  }
}
