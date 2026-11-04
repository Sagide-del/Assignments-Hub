# SBA scorebook and question diagrams

## Access

School administrators: School assessments (`/school-admin/sba`). Teachers: SBA scorebook (`/teacher/sba`). Teachers can enter scores only for their persisted subject/stream assignments. Existing teacher guards and payment code are unchanged.

Scores are retained by learner, subject, grade (10 or 11), term and academic year. Corrections are audited; duplicate saves do not create duplicate records. School reports and CSV exports enforce tenant scope and support grade, stream, pathway and track filters.

## Projection limits

The requested planning formula is 15% Grade 10 SBA + 15% Grade 11 SBA + 70% Grade 12 mock average. Latest recorded academic year is used separately for each SBA grade. Missing components remain missing, and no final projection is shown until all three exist. The displayed letter bands are indicative internal bands, not verified official KNEC policy. Export CSV is a school report, not a certified KNEC import file.

Mock evidence comes from submitted, scored Grade 12 timed mock attempts with valid maximum marks; practice/starter content and manually self-reviewed questions are excluded. MasterModule itself has no student results, so reports use the existing mock-attempt records.

## Diagrams and explanations

New CMS generation requests include two-to-three-sentence explanations and optional validated SVG_BLUEPRINT metadata. Supported renderers: series/parallel circuits and fractional distillation. Nine reusable apparatus primitives are included. Arbitrary SVG markup, external resources and executable metadata are rejected. Unsupported safe apparatus names show a pending placeholder.

Diagrams appear in CMS review, the active exam and released answer review. Plain question text and answer choices support KaTeX. Explanations are released through the existing review permissions, never exposed during the active exam. Existing legacy questions remain supported; this release does not regenerate or add diagrams to historical content automatically.

## Deployment

Migration: `20261104230000_sba_and_question_blueprints` (additive SBA table and nullable question illustration). Render must deploy backend and migration before frontend publishing. The workflow checks `/api/v1/sba/capabilities` for both schema capabilities and retains the existing live RBAC verification and rollback wrapper. Do not rerun taxonomy seed manually.

## Validation

Backend: 412 passed, 7 skipped. Backend and frontend builds passed. New migration applied through Prisma migrate deploy on an isolated PostgreSQL database and a repeat run reported no pending migrations. Browser fixtures verified principal filters/export, teacher entry and assigned pairs, active/released diagrams, KaTeX, and 1440/390/320px layouts. Fixture browser tests are not evidence of production SBA data or production principal login.
