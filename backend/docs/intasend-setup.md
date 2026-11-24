# IntaSend setup: independent learner subscriptions

The IntaSend account must show **Live**, business verification and a signed agreement. The 100-transaction achievement is a growth milestone, not the API integration switch. API keys and the payment webhook must be configured separately.

## What is implemented

- Individual learner M-Pesa STK Push with server-side KES 300/month or KES 3,600/year pricing.
- Existing school pricing stays KES 200 per learner/year; the existing school checkout is also checked against its local invoice and IntaSend status before activation.
- Existing Jenga/Tuma payment records and callback endpoints remain in place.
- New dedicated `independent_intasend_payments` ledger; no historical data is deleted.
- Idempotent initiation, user-row locks, one invoice/activation per verified payment, immutable callback-event capture, callback retries, 15-minute status reconciliation, and status polling.
- A callback is acknowledged after it is durably queued. If the database cannot persist it, the endpoint fails so the provider can retry; it does not falsely acknowledge an unrecorded payment.
- Browser redirects, callback `state`, callback `value`, and client-supplied amounts cannot grant access. The service checks the provider's invoice ID, API reference, KES currency and full invoice value against the local order.
- Sandbox completions do not activate paid accounts. Production refuses sandbox configuration.

## Production setup (no secrets in chat or source control)

1. Deploy this backend commit and its additive Prisma migration. Render runs the configured `prisma migrate deploy` pre-deploy command. Do not rerun a destructive seed or `prisma migrate reset`.
2. In IntaSend's API keys area, choose **Live**, then copy the publishable key and secret key directly into the backend service's **Environment** fields in Render.
3. Set these backend variables:

| Variable | Value |
| --- | --- |
| `INTASEND_ENABLED` | `true`, only after the webhook and keys are configured |
| `INTASEND_TEST_MODE` | `false` |
| `INTASEND_PUBLISHABLE_KEY` | Live publishable key, beginning `ISPubKey_live_` |
| `INTASEND_SECRET_KEY` | Live secret key, beginning `ISSecretKey_live_` |
| `INTASEND_WEBHOOK_SECRET` | A newly generated long random challenge string |
| `NODE_ENV` | `production` |

The secret key and webhook challenge are server-only. Never put them in frontend `VITE_*` settings, screenshots, commits, analytics, or chat. Keep Jenga credentials and old records intact; approval for Jenga can finish independently.

4. Add a payment/collection webhook in IntaSend:

   URL: `https://assignments-hub-api.onrender.com/api/v1/payments/intasend/callback`

   Set its **Challenge** to exactly the same random string as `INTASEND_WEBHOOK_SECRET`. Choose payment/collection status notifications, not transfer-only notifications. If the account UI uses different wording, use IntaSend support to confirm the collection notification selection.

5. Save/redeploy the backend. Read-only readiness check:

   `GET https://assignments-hub-api.onrender.com/api/v1/independent-students/intasend/capabilities`

   Expect `provider: "IntaSend"`, `configured: true`, `mode: "live"`. This checks configuration format, not whether IntaSend accepts the credentials. Invalid/revoked keys can still fail an actual API request.

6. After the frontend deployment, sign in as an independent learner, open activation, and verify it says **Processed by IntaSend**. Opening the page or creating an account must not send an STK Push. Only the learner's explicit **Send M-Pesa prompt** action does.

## Verification and money

No live charge is authorised or executed by the development test suite. It uses mocked IntaSend responses and a disposable PostgreSQL database. A live end-to-end check needs an explicitly authorised M-Pesa number and the genuine subscription amount; do not secretly send a KES 1 live charge or grant a paid subscription from a sandbox event.

For an optional sandbox API smoke test, use test-mode keys in an isolated development environment and set `INTASEND_TEST_PHONE` to an authorised test number. Run `npx ts-node scripts/test-intasend.ts` from `backend` for a redacted dry run. Add `--send` only to send the sandbox request. This script refuses live keys and never activates subscriptions.

When a real customer pays, confirm the local ledger is `CONFIRMED`, exactly one invoice exists, the trial flag is cleared, and a repeated webhook does not extend access again. Check cancellation, insufficient funds, a lost callback and a delayed status response. Do not pay again just because a status request timed out.

If initiation times out before an invoice ID is returned and its callback is also lost, the provider's merchant console may be needed to recover the invoice ID. Do not claim this case was automatically reconciled: the status API requires an invoice ID. Retain the local reference and the payer's receipt for support verification.

## API contract checked

Official IntaSend Python SDK, commit `eb5883d005c7b99a313abae97bc4a788a7571e43`:

- https://github.com/IntaSend/intasend-python/blob/eb5883d005c7b99a313abae97bc4a788a7571e43/intasend/collections.py
- https://github.com/IntaSend/intasend-python/blob/eb5883d005c7b99a313abae97bc4a788a7571e43/intasend/client.py

STK: `POST /api/v1/payment/mpesa-stk-push/`. Status: `POST /api/v1/payment/status/`. Collection invoice fields are verified against the local ledger. Review the actual account's sandbox response before enabling live collection if IntaSend changes the API shape.
