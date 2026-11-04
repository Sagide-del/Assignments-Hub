# Community Service Learning hour logbook

## Where to find it

- Senior learner (Grades 10–12): **My CSL Impact** (`/student/csl`). Submit an activity, date, reflection and hours, optionally with a photo. Only approved hours count toward the 135-hour school tracking target. Download the school logbook PDF once that target is reached.
- Teacher: **CSL Approvals** (`/teacher/csl`). Only learners in persisted assigned grade/stream pairs appear. Approve or reject with a required comment. Earlier activity-review records remain available through **Previous activity reviews**; their hours are not invented or automatically converted.
- School Admin: **School assessments** shows CSL hours, the senior-school completion rate and **Students below 50 CSL hours**. The intervention filter also applies to CSV export. CSL hours do not alter the academic projection formula.

135 hours is a platform tracking target for this release, not a verified KICD/KNEC policy or an automatic examination eligibility decision. Research-project signoff remains separate. PDFs are school logbooks, not official KICD certificates.

## Records, safeguards and API

`CSL_Logbook` is additive. Existing User/School IDs are integers; composite student/school and approver/school foreign keys enforce tenant membership. Existing CSL activity submissions, SBA_Record, payments and TeacherScopeGuard code are preserved.

- `POST /csl/log` accepts multipart `activity_name`, `description`, `hours_logged`, `activity_date` (YYYY-MM-DD, Africa/Nairobi local date), `submission_key` (client UUID), optional `photo`. Reflections: 30–3,000 characters; hours: 0.01–24, up to two decimals. Pending + approved hours cannot exceed 24 on one date. Repeat submission keys return the saved record.
- `GET /csl/my-hours`: approved/pending hours, target, completion and full personal history.
- `GET /csl/pending`: teacher's assigned streams only, oldest 200 pending entries. Reviewing refreshes the next group.
- `PATCH /csl/:id/approve`; `PATCH /csl/:id/reject` with `{comment}`: teacher-only, scope rechecked inside the transaction, row locking, immutable reviewed outcome, audit trail. Repeated approval does not double-count hours. Rejected work can be logged again as a corrected activity.
- `GET /csl/:student_id/logbook-pdf`: owner, assigned teacher, own-school admin or platform admin; approved entries only, target enforced, date order, photo evidence, school letterhead and coordinator signature block. No marks, signatures or examination eligibility are invented.

## Private photo storage and PDF runtime

Use the existing backend AWS_REGION, AWS_S3_BUCKET and AWS credential configuration. Evidence is stored under `marketplace-private/csl/<school>/<learner>/...` using the existing private upload service. The DB holds a durable S3 URL, never image bytes or base64. Authenticated scoped reads issue five-minute signed URLs. JPEG/PNG/WebP files are limited to 5 MB and 12 MP, resized to 1,200px and normalized to JPEG with metadata removed. Failed database submissions attempt cleanup. Viewing-link failures do not lose a saved log or its approval.

`puppeteer-core` + packaged `@sparticuz/chromium` generate A4 PDFs without downloading Chrome at request time. One PDF at a time per instance; at most 500 entries / 20 MB photo evidence. HTML is escaped, JavaScript and outbound browser requests disabled. Photos are read only from their owned private S3 prefix. School logos are included only from the configured bucket/CDN public branding/upload prefix, normalized to raster; arbitrary external URLs are not fetched. `CSL_CHROMIUM_EXECUTABLE` is an optional installed-browser override for controlled environments. PDF responses are private/no-store.

`POST /csl/storage-check` is staff-only. Deployment uploads, reads and removes a tiny diagnostic JPEG using the same private storage path; it does not create learner logs, hours or AI calls. The response reports upload/read and cleanup verification separately.

## Durable AI tagging

A 30-second scheduled worker claims saved pending reflections atomically. The existing DeepSeek router enforces school usage quotas and records AI usage. Only the activity/reflection text is sent; photos, names and admissions are not sent. Responses are validated against the seven competency labels. Invalid responses or provider failure leave the activity saved, mark tagging deferred and retry after six hours, up to three attempts. Stale processing claims can recover after restart. Reading a logbook never triggers a fresh AI request; completed tags are reused. Teachers can verify hours independently of AI availability.

## Validation and deployment

432 backend tests passed (7 skipped), including new real PostgreSQL/JWT tests and an actual Chromium-generated PDF with extracted text assertions. AI and cloud photo calls are mocked in the database tests; a separate photo-service test validates real image normalization and rejection. Browser fixtures verify student submission and download gating, teacher approval/rejection, principal totals/intervention filtering and 1440/390/320px layouts. Both builds passed.

Migration `20261105010000_csl_logbook` was applied through prisma migrate deploy on an isolated migration-history database. The frontend workflow requires CSL schema/API and storage configuration, tests real private photo upload/read, verifies scoped teacher queue and cross-stream PDF denial, and retains existing verified publishing/rollback. It does not create production learner hours or spend DeepSeek credit during release verification.

## Repairing a confirmed AWS permission failure

The release's live storage probe identified a backend S3 AccessDenied error, while teacher queue/scope checks passed. The protected storage probe now supplies its AWS principal ARN, configured bucket and exact CSL prefix on failure; no access keys, secrets or tokens are returned. `operations/enable-csl-storage.sh` runs in the owner's AWS CloudShell, authenticates using the already-provisioned demo teacher, validates account and bucket ownership, and adds only PutObject/GetObject/DeleteObject for `marketplace-private/csl/*` to the identified backend IAM user/role. It refuses the frontend bucket and unknown principals, does not alter bucket policies, existing permissions or application roles, and verifies upload/read/cleanup after IAM propagation. A permissions boundary, organization policy or explicit bucket deny may still require the AWS owner to resolve the denial.
