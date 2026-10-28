import axios from "axios";
import {
  TumaPaymentProvider,
  TumaRequestRejectedException,
} from "./tuma-payment.provider";
jest.mock("axios");
const http = axios as jest.Mocked<typeof axios>;
const config = {
  TUMA_API_KEY: "test-secret",
  TUMA_BUSINESS_EMAIL: "business@example.com",
  TUMA_CALLBACK_BASE_URL:
    "https://api.example/api/v1/independent-students/tuma/callback",
};
const input = {
  amount: 250,
  phone: "254712345678",
  callbackUrl: config.TUMA_CALLBACK_BASE_URL + "/reference/secret",
  reference: "reference",
};
const response = {
  success: true,
  data: {
    checkout_request_id: "checkout-1",
    merchant_request_id: "merchant-1",
  },
};
function setup() {
  return new TumaPaymentProvider({
    get: (key: string) => (config as any)[key],
  } as any);
}
beforeEach(() => jest.resetAllMocks());
describe("Tuma documented API contract", () => {
  for (const auth of [
    { success: true, token: "root-token", expires_in: 86400 },
    { success: true, data: { token: "nested-token" } },
  ])
    it("accepts the documented authentication envelopes and sends KES/STK fields", async () => {
      http.post
        .mockResolvedValueOnce({ data: auth })
        .mockResolvedValue({ data: response });
      const p = setup();
      expect(await p.initiate(input)).toEqual({
        checkoutRequestId: "checkout-1",
        merchantRequestId: "merchant-1",
      });
      expect(http.post).toHaveBeenNthCalledWith(
        1,
        "https://api.tuma.co.ke/auth/token",
        { email: config.TUMA_BUSINESS_EMAIL, api_key: config.TUMA_API_KEY },
        expect.objectContaining({ timeout: 15000 }),
      );
      expect(http.post).toHaveBeenNthCalledWith(
        2,
        "https://api.tuma.co.ke/payment/stk-push",
        expect.objectContaining({
          amount: 250,
          phone: input.phone,
          callback_url: input.callbackUrl,
        }),
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${"token" in auth ? auth.token : auth.data.token}`,
          },
          maxRedirects: 0,
        }),
      );
      await p.initiate({ ...input, reference: "second" });
      expect(
        http.post.mock.calls.filter((c) => c[0].endsWith("/auth/token")),
      ).toHaveLength(1);
    });
  it("does not retry an uncertain POST or expose provider errors containing secrets", async () => {
    http.post
      .mockResolvedValueOnce({ data: { success: true, token: "token" } })
      .mockRejectedValueOnce(new Error("timeout test-secret"));
    await expect(setup().initiate(input)).rejects.toThrow(
      "could not be confirmed",
    );
    expect(http.post).toHaveBeenCalledTimes(2);
  });
  it("rejects missing configuration, malformed auth and explicit provider rejection", async () => {
    const missing = new TumaPaymentProvider({ get: () => undefined } as any);
    await expect(missing.initiate(input)).rejects.toThrow("not configured");
    expect(http.post).not.toHaveBeenCalled();
    http.post.mockResolvedValueOnce({ data: { success: false } });
    await expect(setup().initiate(input)).rejects.toThrow(
      "connection is unavailable",
    );
    http.post
      .mockResolvedValueOnce({ data: { success: true, token: "token" } })
      .mockResolvedValueOnce({ data: { success: false, message: "no" } });
    await expect(setup().initiate(input)).rejects.toBeInstanceOf(
      TumaRequestRejectedException,
    );
  });
});
