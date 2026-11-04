# Supplied taxonomy and grade-band generation

`src/scripts/taxonomy-seed.json` contains the initial 63 entries, the 20 Grade 12 entries and the 44 subsequently supplied entries for Grades 2, 3, 5, 6, 8 and 9. All existing entries and the exact appended strings are preserved. Total: 127 subject entries and 551 supplied topics, representing every grade from 1 through 12. This establishes supplied grade coverage, not a claim that every official subject or strand is present.

This is user-provided taxonomy, not independently verified official KICD coverage. `source = USER_PROVIDED` and `verified = false` retain that distinction. Existing official curriculum ingestion, reviewed outcomes, questions and modules are not overwritten. Taxonomy selection restricts generation labels; it does not establish verified strand/outcome coverage.

## Deployment and seeding

The additive migration creates only `CurriculumTaxonomy`. Run from `backend` against the intended configured database:

```sh
npx prisma migrate deploy
npm run cms:seed-taxonomy
```

The seed is transactional, repeatable and insert-only by default. Existing rows are matched by stable seed ID or grade/pathway/track/subject identity and are always preserved, including unverified edits, custom IDs, timestamps and verification metadata. Upserts use an empty update payload so concurrent seed retries cannot overwrite existing content. `--missing-only` remains a compatible alias for this default behaviour. There is no overwrite mode.

`npm run start:prod` invokes the compiled seed with `--missing-only` before starting the API, so deployments using the existing production command populate the new table after migrations. This does **not** run the legacy question migration. The compiled JSON is emitted alongside the compiled seed by TypeScript.

## API and UI

`GET /api/v1/cms/taxonomy?grade=12` requires PLATFORM_ADMIN and returns the table's exact rows for that grade. The creation form uses cascading grade → pathway → track → subject → topic selects. Grades 1–9 omit pathway/track and store null. Invalid selections, mismatched levels and unseeded grades fail before calling the AI provider. There is no free-text topic fallback.

New generation policies:

| Grades | Theory | Questions | Additional content |
| --- | --- | --- | --- |
| 1–6 | 150 words | 5 | Offline activity |
| 7–9 | 200 words | 10 | Diagram description |
| 10–12 | 300 words | 30 | LaTeX equations and verified 3D asset reference where available |

These are practice drafts, not endorsed official exam papers. Strict JSON validation checks each band's word/question counts and additional fields. New modules store the expected question count, assessment type, profile version and taxonomy provenance. Approval/review and student partial-set labels respect that expected count. Legacy modules retain the previous 30-question enrichment target and are never truncated.

AI is not permitted to invent asset URLs. The existing respiratory model can be linked for matching Biology respiration topics. Other topics currently save `asset_url: null`, visibly indicating that an asset has not been linked. Diagram descriptions are briefs, not generated images.

## Current execution limitation

The configured source database remains unavailable at localhost:5432 in this workspace. Live seeding cannot be verified here. Disposable PostgreSQL verification and actual seed-script runs are reported separately; no production-success claim is made.

## Verified in this workspace

- Supplied JSON was compared directly against both uploaded files: all values and order match the combined arrays exactly.
- Initial seed verification created 83 entries. The missing-grade appendix is verified separately by starting with those 83 rows, retaining administrator edits, adding 44 rows and rerunning without duplicates.
- Database rejected a junior row with non-null pathway/track. Primary five-question CMS content was generated with a mocked provider, published and delivered through the existing assessment engine with its expected count and offline activity intact.
- 60 CMS/submission checks passed with isolated PostgreSQL. The broader backend release suite passed 334 tests (four database checks skipped there because they ran separately). All frontend deployment test groups and both production builds passed.
- Chromium checked Grade 12 exact dropdown choices, valid senior routing, primary null routing, 5/10/30 review approval, missing-grade blocking and desktop/mobile layouts. No paid generation requests were made during verification.
- The live/source database seed attempt failed at localhost:5432; this is separate from successful isolated database testing. Production startup is configured to seed missing taxonomy rows after migrations. Live deployment/seed success still needs external verification.

## Missing-grade appendix verification

The append-only seed was run on disposable PostgreSQL starting from 83 existing entries, including an administrator-edited unverified record with a custom ID. It created exactly 44 rows, updated zero and preserved all original fields/timestamps byte-for-byte after JSON normalization. A second run created zero and skipped all 127. All appended entries matched the uploaded JSON exactly; every grade from 1 through 12 was present, with 127 subject entries and 551 topics. All 60 CMS unit/HTTP/database checks passed, including generation for each newly supplied grade. Browser checks confirmed the previously missing Grades 6, 8 and 9 now provide selectable subjects/topics and generate reviewable drafts.

The subsequent backend release suite passed 342 tests (four database checks were exercised separately), and the production build succeeded. The compiled startup seed skipped all 127 existing fixture rows. The configured source connection remained unavailable at localhost:5432; no live-seeding success is claimed.
