# Supplied taxonomy and grade-band generation

`src/scripts/taxonomy-seed.json` contains the supplied initial 63 entries plus the separately supplied 20 Grade 12 entries, without renaming subjects, tracks or topics. Total: 83 subject entries, 371 topics. Grades present: 1, 4, 7, 10, 11, 12. Grades 2, 3, 5, 6, 8, 9 have no supplied entries; the UI blocks generation for these grades instead of cloning another grade's syllabus.

This is user-provided taxonomy, not independently verified official KICD coverage. `source = USER_PROVIDED` and `verified = false` retain that distinction. Existing official curriculum ingestion, reviewed outcomes, questions and modules are not overwritten. Taxonomy selection restricts generation labels; it does not establish verified strand/outcome coverage.

## Deployment and seeding

The additive migration creates only `CurriculumTaxonomy`. Run from `backend` against the intended configured database:

```sh
npx prisma migrate deploy
npm run cms:seed-taxonomy
```

The seed is transactional and repeatable. It does not delete anything, does not duplicate entries on reruns, and preserves verified rows. Exact matches are skipped. The default explicit seed updates changed, unverified seed-owned entries to the supplied values. `--missing-only` adds missing entries and preserves all existing edits.

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
- Actual seed CLI on disposable PostgreSQL: 83 entries created; a rerun created zero and skipped all 83. All 20 Grade 12 subjects were present. The compiled startup seed also ran successfully.
- Database rejected a junior row with non-null pathway/track. Primary five-question CMS content was generated with a mocked provider, published and delivered through the existing assessment engine with its expected count and offline activity intact.
- 60 CMS/submission checks passed with isolated PostgreSQL. The broader backend release suite passed 334 tests (four database checks skipped there because they ran separately). All frontend deployment test groups and both production builds passed.
- Chromium checked Grade 12 exact dropdown choices, valid senior routing, primary null routing, 5/10/30 review approval, missing-grade blocking and desktop/mobile layouts. No paid generation requests were made during verification.
- The live/source database seed attempt failed at localhost:5432; this is separate from successful isolated database testing. Production startup is configured to seed missing taxonomy rows after migrations. Live deployment/seed success still needs external verification.
