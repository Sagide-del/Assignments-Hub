# SEO and conversion implementation — 15 November 2026

The existing public editorial template, fonts and colours are retained.

## Delivered

- Six topic-specific CTA configurations in the existing static editorial source; mobile content order is title, takeaways, short answer, CTA, article. Desktop retains the right sidebar.
- Ten CSL projects with indicative costs, materials, supervision, evidence and fictional reflection examples to adapt honestly.
- Core/Essential Mathematics comparison plus worked surds and simple-interest examples. University requirements must be checked with institutions; no eligibility guarantees.
- Five Grade 9 maths questions with worked answers and an official KNEC resource link. Generation prefers validated, approved public CMS exports when at least five questions are available, otherwise uses explicitly labelled original editorial practice. This is not a full or official mock.
- Grade 7 English practice, Grade 9 maths practice and grade hubs. Available/coming-soon labels are driven by actual published samples; Grade 9 Sports remains dependent on the reviewed public CMS feed.
- Public Sports and Music screenshot previews at `/labs/sports/preview/` and `/labs/music/preview/`. Full interaction requires an eligible account.
- First-blog attribution on independent registration and explicit payment initiation, plus the Super Admin Global Analytics report for registrations, distinct confirmed paying learners and confirmed KES per source.

## Architecture and safeguards

There is no Blog_Post database model: `cta_config` belongs to the existing static blog source. There is no Student_Progress model: acquisition metadata belongs to the User and payment ledgers, not topic mastery records.

Migration `20261115160000_blog_landing_attribution` adds four nullable VARCHAR(120) columns only. Historical sources are not guessed or backfilled.

Attribution uses a 30-day first-party cookie containing a validated article identifier only, respects Do Not Track/Global Privacy Control, and does not collect queries or form values. Existing first-touch attribution is retained. The report uses confirmed provider records, deduplicates paying learners across providers, and includes renewals in revenue. It does not prove Google caused a sale.

Optional attribution metadata does not change credentials, prices, provider callbacks, payment idempotency or subscription activation. No real STK payment was initiated during testing. Product CTAs preserve a small allowlist of student destinations after login; arbitrary redirect URLs are rejected.

## Validation

Both frontend and backend production builds pass. Node content/security tests, mobile/desktop browser checks, existing unified registration browser checks and public revision checks pass. Real isolated PostgreSQL integration tests cover registration, both provider metadata paths, mirrored payment metadata and confirmed-only reporting with mocked providers.

Deployment is gated on backend capability version 2 and the four migrated columns before publishing the new frontend. CI also runs the new browser regression and database test.
