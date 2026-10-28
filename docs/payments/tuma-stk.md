# Individual M-Pesa subscriptions with Tuma

This release replaces Paystack checkout with Tuma STK Push for independent learners. Schools continue their bank-payment onboarding. No child business accounts are created. Historical Paystack tables, invoices and enum values are retained; Paystack routes, provider implementation and checkout buttons are removed. Existing unmatched Paystack payments must be reconciled by an administrator rather than submitted to the retired webhook.

## Production configuration

In the **backend Render environment**, set:

- `TUMA_BUSINESS_EMAIL`: email of the Assignment Hub business profile in Tuma.
- `TUMA_API_KEY`: that business profile's API key. Keep it server-side; never use a VITE variable or commit it.
- `TUMA_CALLBACK_BASE_URL`: `https://assignments-hub-api.onrender.com/api/v1/independent-students/tuma/callback` (or the equivalent HTTPS URL of the deployed backend). No trailing slash, query or fragment.
- Existing `INDEPENDENT_MONTHLY_PRICE_KES` and `INDEPENDENT_ANNUAL_PRICE_KES`: positive whole-KES subscription prices.

The Tuma business must be approved/live and connected to the intended collection account. This code does not bypass Tuma onboarding. Remove old `PAYSTACK_*` environment secrets after reconciling any outstanding transactions. The UI stays unavailable while Tuma credentials or callback configuration are missing.

Deploy the additive `20261028200000_tuma_individual_stk` Prisma migration before publishing the frontend. Existing Render deployment already runs migrations; the frontend workflow now waits for `/independent-students/tuma/capabilities`, which checks the new table exists. `configured: true` checks configuration presence, not the validity of API credentials or successful collection. No real charge was made by automated tests.

## Student flow

1. Sign in to the independent learner account and open `/student/activate`.
2. Choose monthly or annual access, enter a learner's or parent's Kenyan mobile number, then explicitly request an STK prompt.
3. Enter the M-Pesa PIN on the phone, never in Assignment Hub.
4. The page polls the student's own payment record. Only a matching authenticated callback can create an invoice, extend the entitlement and clear starter restrictions. The frontend then refreshes the session.
5. Failed or cancelled payments can be retried. Pending prompts are recovered after reload. An uncertain or timed-out request instructs the payer to check M-Pesa first; payment success is never inferred from an accepted prompt or a browser action.

Each payment buys one period. There are no automatic recurring deductions. Renewals extend an existing unexpired entitlement; UTC calendar month/year calculations clamp end-of-month dates.

## Tuma API and callback contract

Implementation follows the supplied dashboard documentation: `/auth/token` (both root `token` and nested `data.token` response envelopes) and `/payment/stk-push`. Amounts are KES, not Paystack subunits. API requests have timeouts, authentication tokens are cached server-side, and an uncertain STK POST is never automatically resent.

The supplied docs do **not** document signed callbacks or a transaction-query API. No such endpoint or signature scheme has been invented. Instead, each server-created order supplies Tuma with its own HTTPS callback URL ending in a random 256-bit secret. Only its SHA-256 digest is stored. The secret URL is not returned to the browser. Callback receipt uses a constant-time secret comparison, strict payload validation, and exact merchant request ID, checkout request ID and amount matching. Treat callback URLs as credentials: restrict Tuma API-log access and avoid recording their full paths in proxy access logs. This is a per-order callback capability, not a Tuma-signed webhook or an independent settlement lookup.

Only `status: completed`, `result_code: 0`, the expected amount and a valid receipt format can activate access. Unique checkout/receipt constraints, a single active prompt per learner, idempotency keys and row locks protect against duplicate requests/callbacks and concurrent renewals. Activation, receipt recording, invoice creation and access changes share one database transaction. An early callback is held until initiation IDs are stored, using the same learner lock to avoid callback/initiation races. A late valid callback can still settle an expired prompt. Failure callbacks cannot revoke a confirmed payment.

If a provider timeout loses the initiation response, a later callback is stored but does not grant access without the expected initiation IDs. Operations must inspect Tuma payment logs/receipts and reconcile such uncertain payments. Do not ask a charged student to pay again. A provider-authenticated transaction-status API or signed callback support can strengthen this flow once Tuma supplies its documented contract.

## Verification

Backend tests cover authentication envelopes, request payloads, phone normalization, idempotency, restricted learner access, forged/mismatched callbacks, cancellation, uncertainty, early and duplicate callbacks, receipt reuse, calendar renewal and invoice/access updates. Browser tests use API fixtures to check prompt submission, confirmation polling, reload recovery, retry, access refresh and mobile layouts. These tests do not prove a real handset prompt, receipt, settlement or live callback delivery. After configuration, perform one explicitly authorised low-value live test and check the resulting ledger, invoice and account access before wider use.
