# Practice-to-subscription reporting

Platform admins open **Global Analytics** (`/platform/analytics`). The report
shows the last 30 days of anonymous session counts for practice start,
practice completion, registration opened, account created and payment attempted.
Collection starts at deployment; earlier visits cannot be reconstructed.

The client records at most one of each stage per browser session, using a random
sessionStorage key. It sends only that key, an allowlisted stage and a pathname
without query strings. Names, contact details, credentials, answers, scores,
receipts and payment references are not collected. Requests omit credentials and
referrers. Do Not Track and Global Privacy Control disable collection. Storage
or network failures never block practice, registration or payment.

`POST /api/v1/analytics/acquisition/events` is public, DTO-validated and explicitly
rate-limited. The backend appends namespaced `acquisition.*` records to the
existing AuditLog store. A transaction advisory lock deduplicates concurrent
session/stage retries. No schema migration or analytics account is required.
`GET /api/v1/analytics/acquisition` is PLATFORM_ADMIN-only. Existing teacher,
student and school analytics permissions are unchanged.

Confirmed paying learners are separately counted from CONFIRMED Tuma/Jenga
ledger entries with paidAt in the same period, deduplicated by learner. Browser
clients cannot submit a payment-confirmed stage. No payment activation or
callback logic changed.

These are directional counts, not unique people or a cohort conversion rate.
Direct entrants can skip stages; privacy preferences and unavailable storage or
network can reduce browser counts. Confirmed payments include all traffic and
are not attributed to anonymous sessions or Search Console queries. School bank
payments and historical providers are outside this individual payment total.

Deployment waits for the public readiness endpoint
`/api/v1/analytics/acquisition/capabilities` before publishing instrumented pages.
The browser tests stub collection, so CI practice attempts do not inflate live
counts. The collector endpoint is generated from VITE_API_URL (or the existing
Render production default) during the public build.
