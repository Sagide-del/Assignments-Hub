import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { JengaAuthService } from "./jenga-auth.service";
import { JengaSignatureService } from "./jenga-signature.service";
import { normalizeMpesaPhone } from "./tuma-payment.provider";

@Injectable()
export class JengaPaymentProvider {
  constructor(
    private readonly config: ConfigService,
    private readonly auth: JengaAuthService,
    private readonly signature: JengaSignatureService,
  ) {}

  isConfigured() {
    return (
      this.config.get<string>("JENGA_ENABLED") === "true" &&
      Boolean(
        this.config.get<string>("JENGA_API_KEY")?.trim() &&
          this.config.get<string>("JENGA_MERCHANT_CODE")?.trim() &&
          this.config.get<string>("JENGA_CONSUMER_SECRET")?.trim() &&
          this.config.get<string>("JENGA_ACCOUNT_NUMBER")?.trim() &&
          (this.config.get<string>("JENGA_PRIVATE_KEY_PEM")?.trim() ||
            this.config.get<string>("JENGA_PRIVATE_KEY_PATH")?.trim()) &&
          this.callbackUrl(),
      )
    );
  }

  private baseUrl() {
    return this.config.get<string>("JENGA_ENV") === "sandbox"
      ? "https://uat.finserve.africa"
      : "https://api.finserve.africa";
  }

  private callbackUrl() {
    const value = this.config.get<string>("JENGA_CALLBACK_URL")?.trim();
    if (!value) return null;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.search && !url.hash
        ? url.toString()
        : null;
    } catch {
      return null;
    }
  }

  async initiate(input: {
    amount: number;
    phone: string;
    reference: string;
  }) {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        "Jenga M-Pesa payments are not configured yet.",
      );
    }
    if (!Number.isSafeInteger(input.amount) || input.amount < 1) {
      throw new BadRequestException("Payment amount must be a whole number.");
    }
    const phone = normalizeMpesaPhone(input.phone);
    if (!phone || phone !== input.phone) {
      throw new BadRequestException("A valid Kenyan mobile number is required.");
    }
    if (!/^[A-Z0-9]{6}$/.test(input.reference)) {
      throw new BadRequestException("Invalid payment reference.");
    }

    const accountNumber = this.config.get<string>("JENGA_ACCOUNT_NUMBER")!.trim();
    const amount = String(input.amount);
    const body = {
      merchant: {
        accountNumber,
        name:
          this.config.get<string>("JENGA_MERCHANT_NAME")?.trim() ||
          "Andolih Edtech Studios",
      },
      payment: {
        ref: input.reference,
        mobileNumber: phone,
        telco: "Safaricom",
        amount,
        currency: "KES",
        date: new Date().toISOString().slice(0, 10),
        callBackUrl: this.callbackUrl(),
        pushType: "STK",
      },
    } as const;

    const send = async () => {
      const token = await this.auth.accessToken();
      const signed = this.signature.sign({
        accountNumber,
        reference: input.reference,
        mobileNumber: phone,
        telco: "Safaricom",
        amount,
        currency: "KES",
      });
      return axios.post(
        `${this.baseUrl()}/v3-apis/payment-api/v3.0/stkussdpush/initiate`,
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Signature: signed,
            "Content-Type": "application/json",
          },
          timeout: 25000,
          maxRedirects: 0,
        },
      );
    };

    try {
      const { data } = await send();
      return {
        providerReference:
          typeof data?.transactionReference === "string"
            ? data.transactionReference
            : typeof data?.reference === "string"
              ? data.reference
              : null,
        providerPayload: data as unknown,
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        this.auth.clearToken();
      }
      if (
        axios.isAxiosError(error) &&
        [400, 401, 403, 404, 409, 422].includes(error.response?.status ?? 0)
      ) {
        throw new BadGatewayException(
          "Jenga declined the payment request. Check the phone number and try again.",
        );
      }
      if (error instanceof BadRequestException) throw error;
      throw new BadGatewayException(
        "The M-Pesa prompt could not be confirmed. Check your phone before trying again.",
      );
    }
  }
}
