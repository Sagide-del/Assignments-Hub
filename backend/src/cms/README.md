# Master Content Library API

All management routes require `PLATFORM_ADMIN`. The public store is catalogue metadata only; it never returns `content_json` or answer keys.

## Generate a draft

`POST /api/v1/cms/drafts` now generates content through the existing DeepSeek router. The caller supplies metadata, not generated JSON or token totals:

```json
{
  "grade": 11,
  "subject": "Aviation Technology",
  "topic": "Aerodynamics",
  "pathway": "STEM",
  "track": "Technical and Engineering"
}
```

Selections must exist in `CurriculumTaxonomy`. The server derives the stored level, pathway and track from the matched row; Grades 1–9 always store null pathway/track. See [TAXONOMY.md](./TAXONOMY.md) for seeding, exact supplied coverage and missing grades.

Successful responses contain a saved DRAFT module and actual provider token usage. Generation is grade-dependent:

- Grades 1–6: 150 words, an offline activity and 5 questions.
- Grades 7–9: 200 words, a diagram description and 10 questions.
- Grades 10–12: 300 words, LaTeX equations, an illustration brief, 30 questions and a verified 3D asset URL where available (otherwise null).

Questions contain question_text, four distinct options, correct_answer equal to a full option, and explanation. Metadata records the expected count and taxonomy provenance. These are practice drafts, not official papers. Asset URLs are supplied/verified by the application rather than invented by the provider.

The shared router already requests JSON-object output. CMS validation also rejects missing/extra fields, invalid question counts, duplicated prompts/options, empty fields and invalid answer keys. No placeholder content or paid schema-repair retries are introduced. Invalid JSON/schema produces HTTP 400 with `AI Generation failed, try again.` Provider credit/configuration failures retain the existing 503 guidance.

A CMS-storage probe runs before the provider call. Apply the CMS migration first: unavailable storage produces 503 without spending model credit. Storage errors after generation remain storage failures, rather than misleading requests to regenerate malformed JSON. No migrations are run by this endpoint.

Provider totalTokens is stored when present, otherwise a valid promptTokens + completionTokens sum is used. Missing/invalid accounting is rejected, not silently recorded as zero. The authenticated administrator's context is passed to the shared usage logger/quota mechanism. Failed paid generations may still incur provider usage even though no module is saved; module token totals describe successfully saved modules, not every account charge.

## Other routes

- GET `/api/v1/cms/taxonomy?grade=12`: grade-specific dropdown options.
- GET `/api/v1/cms/drafts`: DRAFT and APPROVED records.
- PATCH `/api/v1/cms/drafts/:id/approve`: approve a draft.
- POST `/api/v1/cms/publish`: publish an approved module to STORE or SCHOOL, with optional stream labels.
- GET `/api/v1/cms/store`: public published-store metadata.
- GET `/api/v1/cms/modules/:id`: platform-admin module content and delivery details.
- GET `/api/v1/cms/publications/schools`: platform-admin school-publication list.

Generation never auto-approves or publishes a module and does not populate the older Question Bank automatically.

## Verification and current UI boundary

Run `npm test -- --runInBand src/cms` and `npm run build` from backend. HTTP tests use the real NestJS/JWT/role guards and validation with mocked DeepSeek and persistence; they do not charge the API or verify production database writes.

The frontend Generate button sends metadata to POST /cms/drafts and opens the saved draft. The review parser supports theory_text/question_text/correct_answer, and approved modules publish through the school/stream modal. A live UI/database smoke test also requires the paused CMS migration and configured DeepSeek access.

The additive CMS migration is included. The optional PostgreSQL integration suite uses CMS_TEST_DATABASE_URL, accepts only a disposable localhost database named cms_publish_test, and is skipped unless explicitly configured. It proves that publishing creates ModuleAssignment rows, including under concurrent retries.
