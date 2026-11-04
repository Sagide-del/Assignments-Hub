# Tuma callback auditing and reconciliation

## Current state: vendor status adapter blocked

The scheduler runs every 15 minutes. It selects up to 100 PENDING ledger rows older than 15 minutes. A database lease prevents multiple replicas querying the same payment simultaneously. Missing checkout IDs require manual verification. Exceptions leave payments pending for a later retry.

**Live reconciliation is NOT enabled.** Tuma's supplied contract documents authentication and STK initiation only. No status endpoint, method or response format has been provided. `TumaPaymentProvider.statusQueryConfigured()` deliberately returns false; the job raises an operational error when aged payments exist. Do not change this to true without implementing and testing the documented adapter.

Obtain from Tuma support: transaction-status URL, HTTP method, authentication and request fields, a redacted successful/pending/failed/cancelled response, and the meanings of amount, real M-Pesa receipt, merchant and checkout identifiers. Confirm whether lookup by CheckoutRequestID is supported. The adapter must validate these fields and return the existing canonical callback payload. Unknown, pending and incomplete results must never be interpreted as success. No STK push is initiated by reconciliation.

When wired, confirmed results use the **same atomic subscription/invoice settlement** as callbacks. Unique receipts, account locking and the CONFIRMED guard prevent repeated activation, including a late callback after reconciliation. CANCELLED is retained as a distinct ledger status.

## Audit capture

Both callback routes read Nest's `rawBody` buffer (`rawBody: true` in bootstrap). After authenticating the callback secret, the original UTF-8 JSON text is committed before payload validation or settlement. `Payment.raw_payload` retains the first authenticated body; a PostgreSQL trigger rejects replacement. `MpesaRawCallbackEvent` preserves all distinct bodies by SHA-256 with append-only UPDATE/DELETE protection. Duplicate identical callbacks do not create extra events. No raw payload or secret is written to application logs.

Authentication necessarily precedes auditing to prevent public requests poisoning a payment's first body. Invalid JSON rejected by the HTTP parser never reaches the callback handler. Audit rows have no cascading foreign key so historical evidence survives removal of an operational order. Database administrators can still alter schemas; these triggers protect ordinary application writes, not privileged infrastructure access.

If the database is entirely unavailable, an audit write to it cannot succeed. The existing callback handler acknowledges HTTP 200, attempts a local retry and logs a reconciliation alert. Until the documented status adapter is connected, lost callbacks still require manual verification with Tuma. This is not a complete outage-recovery guarantee. For durable ingestion independent of database availability, add an external persistent queue/object-store journal before acknowledging; no such infrastructure is provisioned here.

## Release and verification

Apply `20261104210000_tuma_reconciliation` after the existing ledger/inbox migration using the normal reviewed migration process. This work does not apply production migrations or deploy production.

Tests exercise the scheduler, disabled-adapter guard, leases, network errors, missing IDs, FAILED/CANCELLED paths and raw-body ordering. The opt-in PostgreSQL HTTP integration tests verify write-once audit triggers, duplicate callbacks and recovery/late-callback idempotency using a mocked status adapter; no live Tuma request or charge is made.
