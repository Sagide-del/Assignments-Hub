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

## External physical mock imports

School assessments → Import External Mocks → Download CSV Template. The template contains this school's Grade 10–12 learners who have admission numbers. Fill Subject, Grade Level, Term and percentage Score, keeping admission numbers as text. Copy rows for more subjects. Use one CSV or one-sheet XLSX, at most 5 MB / 2,000 rows; formulas and oversized workbook expansion are rejected.

Enter an exam/source name and academic year, then import. Admissions and optional names must match this school's senior roster. Subjects are matched case-insensitively against grade-specific CurriculumTaxonomy entries for the learner's active pathway (with shared core subjects allowed). Missing pathway/curriculum information produces an actionable row error rather than accepting arbitrary subjects. Historical grades cannot exceed the student's current grade. Blank template rows do not become zero scores.

Valid rows import atomically with score-change audit records and refreshed SBA_Projection snapshots. Invalid rows are reported by spreadsheet row number, admission number and reason. Correct and retry using the same exam/source and year: the logical key is student + subject + grade + term + year + source. Identical scores are unchanged; corrected scores update the existing record with an audit trail. Different exam names represent distinct mocks. No legacy SBA_Record or payment schema is altered.

The live school report always derives fresh values; saved projections are explicitly timestamped merge snapshots. The Grade 12 external mock component is the mean of this learner's imported Grade 12 scores in the latest imported academic year, across subjects/exams. Grade 10–11 mocks remain historical records and do not replace their internal SBA. The final mock component is max(external average, internal average); either available source can be used alone, and zero is a real mark. With both absent, projection remains incomplete. These optimistic planning projections are not official KCBE grades.

`GET /sba/import/template`, multipart `POST /sba/import/upload` (file, source, academic_year), and `POST /sba/import/merge` are SCHOOL_ADMIN only and derive school identity from the authenticated session. Teacher report reads remain scoped to assigned subject/stream pairs. Individual learner flows are unchanged. Database foreign keys independently enforce the student/importer's school on imported rows.

Verification: 420 backend tests passed (7 skipped); CSV/XLSX parsing, formula rejection, ten-row import, idempotent retry, correction audit, best-of merge, saved projections and tenant/stream boundaries were tested. Browser checks cover template download, upload summary/error table, recalculation and 1440/390/320px layouts. CI gates frontend publishing on the new API/schema version and performs read-only live teacher denials and scorebook scope checks; it never uploads real school marks as a deployment test.
