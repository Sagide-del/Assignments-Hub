# Tuma M-Pesa payment flow and current pricing

## Scope and release status

The active integration is **Tuma**, not direct Daraja. The owner currently has a live-only Tuma account and is completing Daraja KYC. No provider sandbox endpoint has been supplied, no live STK request is authorized for this task, and this change must not be deployed to production yet. Verification uses a simulated Tuma transport and disposable PostgreSQL; it cannot prove handset delivery, real settlement or a live provider callback.

Schools retain bank-payment onboarding. The unused school Daraja option is hidden and its initiation route refuses requests before creating an invoice. Historical payment/invoice/subscription rows remain intact.

## Prices

- Individual: **KES 300 per calendar month**. Existing annual-prepayment functionality is retained at 12 × 300 = KES 3,600, with no discount or recurring deduction. New quotes ignore old environment price overrides; past orders settle at their original snapshot amount.
- School: **KES 200 per registered learner per calendar year**, regardless of school size or boarding/day type. New school invoices and payment transactions are annual. Monthly school checkout requests are rejected. There is no free-size band, tier discount or monthly school rate. A school must register at least one learner before requesting an invoice.

School pricing, School Admin billing/dashboard labels and invoice PDFs use annual values. Financial reports convert annual subscriptions to a monthly equivalent for estimates; they do not charge monthly. Existing historical invoices and their period/rate snapshots are not repriced.

## Provider request contract

The documented Tuma request is `POST /auth/token` followed by `POST /payment/stk-push` with `amount`, `phone`, `callback_url` and `description`. Amounts are positive whole shillings, phone numbers are normalized to Kenyan 254 format, and `description = AssignmentHub` is 13 characters. Newly created internal references are 12 characters. Credentials and callback secrets must not be logged.

**Daraja fields are not Tuma fields.** BusinessShortCode, Password, Timestamp, TransactionType, PartyA/PartyB and Safaricom AccountReference are constructed upstream by Tuma and are not exposed in its supplied API contract. We cannot independently inspect or certify their upstream values. No undocumented Daraja fields are injected into Tuma requests. `.env.example` documents MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_PASSKEY, MPESA_SHORTCODE, MPESA_ENV and MPESA_CALLBACK_URL for future onboarding; these do not enable a direct Daraja integration in this release.

Tuma credentials: TUMA_BUSINESS_EMAIL, TUMA_API_KEY, TUMA_CALLBACK_BASE_URL. The existing callback base remains supported. The new exact alias is `https://<backend>/api/payments/mpesa/callback`; the application adds per-order `reference` and `token` query parameters. Do not configure a native Daraja callback to this Tuma-format endpoint before implementing that adapter.

## Callback acknowledgement and durability

Both the old callback URL and `/api/payments/mpesa/callback` return HTTP 200 with an accepted response. The handler only authenticates the per-order secret and persists a small `MpesaCallbackInbox` event; it does not wait for invoice creation or access activation. Malformed/unauthenticated payloads are acknowledged without activation. Callback routes bypass request throttling so valid provider retries are not turned into 429 responses.

The background worker claims due events with a database lease, processes them transactionally and marks them processed. Failed processing is stored and retried with backoff; process restarts recover the inbox. Duplicate canonical events share a unique event key. More importantly, activation locks the learner row and checks the persisted confirmed order, so duplicate checkout callbacks cannot extend access or create another invoice, even if reprocessed. Unique checkout IDs and receipts provide additional protection.

If the inbox database cannot accept a callback, the required HTTP-200 policy still acknowledges it, logs a reconciliation alert and schedules a local persistence retry. That fallback is not durable across an immediate process/container failure. Pending payments must be reconciled from Tuma in such an outage; never infer success or tell a charged learner to pay again. Zero-loss acknowledgement during a complete storage outage needs a separately available durable queue or a documented provider status API, neither of which is configured here. This limitation must be resolved/accepted before production rollout rather than concealed behind a successful mock test.

Tuma's supplied documentation has no signed-webhook or independent status-query contract. The random 256-bit callback capability, constant-time hash comparison and exact amount/merchant/checkout matching remain the verification mechanism. Keep full callback URLs out of access logs. An initiation timeout with unknown provider identifiers stays awaiting verification, not automatically activated. A callback arriving early is retained until initiation IDs are available.

## Payment ledger and migration

Apply the additive `20261104200000_mpesa_payment_ledger_inbox` migration in the intended environment only after release approval. It adds Payment (PENDING/SUCCESS/FAILED) and MpesaCallbackInbox. Existing IndependentTumaPayment rows are backfilled into the new financial ledger, preserving original amounts, timestamps, receipts and statuses without reactivation. Existing orders remain the operational state source; financial ledger updates, invoice creation and access updates occur in the same transaction. Financial ledger foreign keys restrict deletion of users/schools that have ledger history.

## Safe verification

From backend:

```sh
npm run test:mpesa -- --mock
```

This prints the complete Tuma request/response structure with secrets redacted, uses exactly a **simulated** 1 KES amount and never performs a network request. Without --mock, the script requires TUMA_ENV=sandbox, TUMA_SANDBOX_CONFIRMED=true, a separate vendor-confirmed HTTPS sandbox origin and an authorized TUMA_TEST_PHONE. It refuses production mode and never falls back to Tuma's live endpoint. A live-only account therefore cannot complete the genuine sandbox test.

The opt-in tuma-flow.database.spec.ts accepts only MPESA_TEST_DATABASE_URL with hostname 127.0.0.1 and database mpesa_test. It exercises real JWT/roles/trial guards, HTTP STK initiation and callbacks, the persistent inbox/ledger and real PostgreSQL invoice/access updates, with only Tuma's transport simulated. It verifies 200-before-activation, duplicate delivery, amount mismatch, forged secrets, cancellation and one-time subscription extension. No real phone is contacted.

## Verification recorded for this change

- Simulated 1 KES script request/response passed; live-only mode was refused without any outbound request.
- Disposable PostgreSQL migration backfilled a historical KES 200 confirmed payment intact without changing its entitlement.
- 24 targeted tests passed, including real JWT-protected HTTP initiation, public HTTP callbacks, concurrent duplicate callbacks, altered duplicate payloads and one-time invoice/access creation. The broader backend suite passed 347 tests; database checks ran separately. Both production builds passed.
- Browser checks confirmed KES 300/month individual pricing and annual-only school billing showing KES 24,000 for 120 learners.
- No production migration, deployment, handset prompt, live charge or genuine vendor sandbox request was performed. This remains on a review branch.
