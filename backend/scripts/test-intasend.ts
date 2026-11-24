import "dotenv/config";
import axios from "axios";
async function main() {
  const pub = process.env.INTASEND_PUBLISHABLE_KEY ?? "",
    secret = process.env.INTASEND_SECRET_KEY ?? "",
    phone = process.env.INTASEND_TEST_PHONE ?? "";
  if (
    process.env.INTASEND_TEST_MODE !== "true" ||
    !pub.startsWith("ISPubKey_test_") ||
    !secret.startsWith("ISSecretKey_test_")
  )
    throw Error(
      "Sandbox only: configure matching test keys and INTASEND_TEST_MODE=true.",
    );
  if (!/^254[17]\d{8}$/.test(phone))
    throw Error(
      "Set INTASEND_TEST_PHONE securely to an authorised Kenyan test number.",
    );
  const payload = {
    public_key: pub,
    currency: "KES",
    method: "M-PESA",
    amount: 1,
    phone_number: phone,
    api_ref: "sandbox-smoke-" + Date.now(),
    narrative: "AH sandbox",
  };
  console.log({
    mode: process.argv.includes("--send") ? "SANDBOX SEND" : "DRY RUN",
    endpoint: "https://sandbox.intasend.com/api/v1/payment/mpesa-stk-push/",
    amount: 1,
    currency: "KES",
    phone: phone.slice(0, 5) + "****" + phone.slice(-3),
  });
  if (!process.argv.includes("--send")) return;
  try {
    const r = await axios.post(
      "https://sandbox.intasend.com/api/v1/payment/mpesa-stk-push/",
      payload,
      {
        headers: {
          Authorization: `Bearer ${secret}`,
          INTASEND_PUBLIC_API_KEY: pub,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      },
    );
    console.log({
      invoiceId: r.data?.invoice?.invoice_id,
      state: r.data?.invoice?.state,
    });
  } catch (e) {
    console.error({
      message:
        "Sandbox request failed; no credentials or raw provider payload logged.",
      httpStatus: axios.isAxiosError(e) ? e.response?.status : undefined,
    });
    process.exitCode = 1;
  }
}
void main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Sandbox setup failed");
  process.exitCode = 1;
});
