import axios from "axios";
import { IntasendStkProvider } from "./intasend-stk.provider";
jest.mock("axios");
const http = axios as jest.Mocked<typeof axios>;
const values: Record<string, string> = {
  INTASEND_ENABLED: "true",
  INTASEND_TEST_MODE: "false",
  INTASEND_PUBLISHABLE_KEY: "ISPubKey_live_fixture",
  INTASEND_SECRET_KEY: "ISSecretKey_live_fixture",
  INTASEND_WEBHOOK_SECRET: "local-webhook-fixture",
  NODE_ENV: "test",
};
function setup(overrides: Partial<Record<string, string>> = {}) {
  const v = { ...values, ...overrides };
  return new IntasendStkProvider({ get: (k: string) => v[k] } as any);
}
beforeEach(() => jest.clearAllMocks());
it("uses the official STK endpoint, merchant authentication, stable api_ref and whole KES", async () => {
  http.post.mockResolvedValue({
    data: { invoice: { invoice_id: "invoice-1" } },
  });
  const p = setup();
  expect(p.isConfigured()).toBe(true);
  await expect(
    p.initiate({
      amount: 300,
      phone: "254712345678",
      reference: "order-uuid",
      name: "Learner",
    }),
  ).resolves.toEqual({ invoiceId: "invoice-1" });
  expect(http.post).toHaveBeenCalledWith(
    "https://payment.intasend.com/api/v1/payment/mpesa-stk-push/",
    expect.objectContaining({
      amount: 300,
      currency: "KES",
      method: "M-PESA",
      phone_number: "254712345678",
      api_ref: "order-uuid",
    }),
    expect.objectContaining({
      timeout: 20000,
      headers: expect.objectContaining({
        Authorization: "Bearer ISSecretKey_live_fixture",
      }),
    }),
  );
});
it("queries payment/status, not checkout/details", async () => {
  http.post.mockResolvedValue({ data: { invoice: { state: "COMPLETE" } } });
  await setup().status("invoice-1");
  expect(http.post.mock.calls[0][0]).toBe(
    "https://payment.intasend.com/api/v1/payment/status/",
  );
  expect(http.post.mock.calls[0][1]).toMatchObject({
    invoice_id: "invoice-1",
    public_key: "ISPubKey_live_fixture",
  });
});
it("requires matching mode/keys, challenge and an explicit enable flag; production rejects sandbox", () => {
  for (const v of [
    { INTASEND_ENABLED: "false" },
    { INTASEND_WEBHOOK_SECRET: "" },
    { INTASEND_TEST_MODE: "true" },
    { INTASEND_SECRET_KEY: "not-a-key" },
    {
      NODE_ENV: "production",
      INTASEND_TEST_MODE: "true",
      INTASEND_PUBLISHABLE_KEY: "ISPubKey_test_fixture",
      INTASEND_SECRET_KEY: "ISSecretKey_test_fixture",
    },
  ])
    expect(setup(v).isConfigured()).toBe(false);
  expect(
    setup({
      INTASEND_TEST_MODE: "true",
      INTASEND_PUBLISHABLE_KEY: "ISPubKey_test_fixture",
      INTASEND_SECRET_KEY: "ISSecretKey_test_fixture",
    }).isConfigured(),
  ).toBe(true);
});
it("authenticates callbacks without accepting missing or wrong challenge", () => {
  expect(setup().validChallenge({ challenge: "local-webhook-fixture" })).toBe(
    true,
  );
  expect(setup().validChallenge({ challenge: "wrong" })).toBe(false);
  expect(setup().validChallenge(null)).toBe(false);
});
it("rejects invalid amounts, malformed responses and hides upstream secrets on errors", async () => {
  await expect(
    setup().initiate({
      amount: 1.2,
      phone: "254712345678",
      reference: "ref",
      name: "Learner",
    }),
  ).rejects.toThrow("Invalid payment amount");
  expect(http.post).not.toHaveBeenCalled();
  http.post.mockRejectedValue({
    config: { headers: { Authorization: "secret-should-not-leak" } },
    response: { data: "private" },
  });
  await expect(
    setup().initiate({
      amount: 300,
      phone: "254712345678",
      reference: "ref",
      name: "Learner",
    }),
  ).rejects.toThrow("could not be confirmed");
});
