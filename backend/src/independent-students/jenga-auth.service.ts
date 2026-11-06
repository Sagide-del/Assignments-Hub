import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class JengaAuthService {
  private token: string | null = null;
  private expiresAt = 0;
  private pending: Promise<string> | null = null;

  constructor(private readonly config: ConfigService) {}

  private baseUrl() {
    return this.config.get<string>("JENGA_ENV") === "sandbox"
      ? "https://uat.finserve.africa"
      : "https://api.finserve.africa";
  }

  async accessToken() {
    if (this.token && Date.now() < this.expiresAt) return this.token;
    if (this.pending) return this.pending;

    this.pending = (async () => {
      const apiKey = this.config.get<string>("JENGA_API_KEY")?.trim();
      const merchantCode = this.config
        .get<string>("JENGA_MERCHANT_CODE")
        ?.trim();
      const consumerSecret = this.config
        .get<string>("JENGA_CONSUMER_SECRET")
        ?.trim();
      if (!apiKey || !merchantCode || !consumerSecret) {
        throw new ServiceUnavailableException(
          "Jenga M-Pesa payments are not configured yet.",
        );
      }

      try {
        const { data } = await axios.post(
          `${this.baseUrl()}/authentication/api/v3/authenticate/merchant`,
          { merchantCode, consumerSecret },
          {
            headers: { "Content-Type": "application/json", "Api-Key": apiKey },
            timeout: 15000,
            maxRedirects: 0,
          },
        );
        const token = data?.accessToken ?? data?.data?.accessToken;
        if (typeof token !== "string" || !token.trim()) {
          throw new Error("Jenga did not return an access token");
        }
        this.token = token;
        // Jenga's documented response does not guarantee an expiry field.
        // Keep a conservative cache to avoid sending an expired token.
        this.expiresAt = Date.now() + 9 * 60 * 1000;
        return token;
      } catch (error) {
        if (error instanceof ServiceUnavailableException) throw error;
        throw new ServiceUnavailableException(
          "Jenga authentication is unavailable. Please try again later.",
        );
      } finally {
        this.pending = null;
      }
    })();

    return this.pending;
  }

  clearToken() {
    this.token = null;
    this.expiresAt = 0;
  }
}
