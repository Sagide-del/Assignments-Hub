/** Safe test entry point. --mock never makes a network request. No live mode. */
import axios, { AxiosAdapter } from "axios";
import { ConfigService } from "@nestjs/config";
import {
  TumaPaymentProvider,
  normalizeMpesaPhone,
} from "../src/independent-students/tuma-payment.provider";
import { randomBytes } from "crypto";
async function main() {
  const mock = process.argv.includes("--mock");
  const env: Record<string, string | undefined> = mock
    ? {
        TUMA_ENV: "sandbox",
        TUMA_SANDBOX_CONFIRMED: "true",
        TUMA_API_BASE_URL: "https://sandbox.tuma.invalid",
        TUMA_API_KEY: "mock-secret",
        TUMA_BUSINESS_EMAIL: "test@example.invalid",
        TUMA_CALLBACK_BASE_URL:
          "https://example.invalid/api/payments/mpesa/callback",
      }
    : process.env;
  if (
    !mock &&
    (env.TUMA_ENV !== "sandbox" || env.TUMA_SANDBOX_CONFIRMED !== "true")
  )
    throw Error(
      "Tuma live-only mode cannot be used for this sandbox test. No STK was sent. Use --mock for a simulation.",
    );
  const phone = normalizeMpesaPhone(
    mock ? "0700000001" : env.TUMA_TEST_PHONE || "",
  );
  if (!phone)
    throw Error("Set an authorized TUMA_TEST_PHONE for the vendor sandbox.");
  const token = randomBytes(32).toString("hex");
  const redact = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(redact);
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([key, v]) => [
          key,
          /api_key|token|password|authorization|secret|passkey/i.test(key)
            ? "[REDACTED]"
            : redact(v),
        ]),
      );
    return typeof value === "string"
      ? value.replaceAll(token, "[REDACTED]")
      : value;
  };
  console.log(
    mock
      ? "SIMULATION ONLY: no external requests, handset prompt or charge."
      : "Vendor sandbox test: exactly 1 KES; no production endpoint is permitted.",
  );
  if (mock) {
    const adapter: AxiosAdapter = async (config) => ({
      status: 200,
      statusText: "OK",
      headers: {},
      config,
      data: String(config.url).endsWith("/auth/token")
        ? { success: true, token: "mock-access-token" }
        : {
            success: true,
            data: {
              checkout_request_id: "mock-checkout",
              merchant_request_id: "mock-merchant",
            },
          },
    });
    axios.defaults.adapter = adapter;
  }
  axios.interceptors.request.use((config) => {
    console.log(
      "REQUEST",
      config.method,
      config.url,
      JSON.stringify(
        redact(
          typeof config.data === "string"
            ? JSON.parse(config.data)
            : config.data,
        ),
        null,
        2,
      ),
    );
    return config;
  });
  axios.interceptors.response.use((response) => {
    console.log(
      "RESPONSE",
      response.status,
      JSON.stringify(redact(response.data), null, 2),
    );
    return response;
  });
  const provider = new TumaPaymentProvider(new ConfigService(env));
  if (!provider.isConfigured())
    throw Error(
      "A vendor-confirmed, non-production Tuma sandbox URL and credentials are required. No STK was sent.",
    );
  console.log(
    "REQUEST IDS",
    await provider.initiate({
      amount: 1,
      phone,
      reference: "AHTEST000001",
      callbackUrl: provider.callbackUrl("AHTEST000001", token),
    }),
  );
  console.log(
    "An initiation acknowledgement is not proof of payment. Callback, invoice and access verification are exercised by the isolated integration test.",
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
