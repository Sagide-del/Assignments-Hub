# Master Content Library API

All management routes require `PLATFORM_ADMIN`. The public store is catalogue metadata only; it never returns `content_json` or answer keys.

## Generate a draft

`POST /api/v1/cms/drafts` now generates content through the existing DeepSeek router. The caller supplies metadata, not generated JSON or token totals:

```json
{
  "grade": 11,
  "subject": "Aviation",
  "topic": "Four Forces of Flight",
  "pathway": "STEM"
}
```

`level` and `track` are optional. Without an explicit level, Grades 10–12 use Senior School, 7–9 Junior School, and 1–6 Primary School.

The successful 201 response is a saved MasterModule with status DRAFT and provider token usage in generation_cost_tokens. Its content_json has exactly:

- `theory_text`: exactly 300 whitespace-separated words.
- `equations`: up to 30 LaTeX strings, or an empty array where equations are unnecessary.
- `illustration_prompt`: a graph-description prompt; this does not generate or download an image.
- `questions`: exactly 30 distinct questions, each containing question_text, four distinct options, correct_answer equal to a full option string, and explanation.

The shared router already requests JSON-object output. CMS validation also rejects missing/extra fields, invalid question counts, duplicated prompts/options, empty fields and invalid answer keys. No placeholder content or paid schema-repair retries are introduced. Invalid JSON/schema produces HTTP 400 with `AI Generation failed, try again.` Provider credit/configuration failures retain the existing 503 guidance.

A CMS-storage probe runs before the provider call. Apply the CMS migration first: unavailable storage produces 503 without spending model credit. Storage errors after generation remain storage failures, rather than misleading requests to regenerate malformed JSON. No migrations are run by this endpoint.

Provider totalTokens is stored when present, otherwise a valid promptTokens + completionTokens sum is used. Missing/invalid accounting is rejected, not silently recorded as zero. The authenticated administrator's context is passed to the shared usage logger/quota mechanism. Failed paid generations may still incur provider usage even though no module is saved; module token totals describe successfully saved modules, not every account charge.

## Other routes

- GET `/api/v1/cms/drafts`: DRAFT and APPROVED records.
- PATCH `/api/v1/cms/drafts/:id/approve`: approve a draft.
- POST `/api/v1/cms/publish`: publish an approved module to STORE or SCHOOL, with optional stream labels.
- GET `/api/v1/cms/store`: public published-store metadata.

Generation never auto-approves or publishes a module and does not populate the older Question Bank automatically.

## Verification and current UI boundary

Run `npm test -- --runInBand src/cms` and `npm run build` from backend. HTTP tests use the real NestJS/JWT/role guards and validation with mocked DeepSeek and persistence; they do not charge the API or verify production database writes.

The frontend Generate button and its parser are intentionally unchanged for this backend-only task. The current frontend still shows its pending state. Wiring it requires the new metadata-only POST contract and support for theory_text/question_text/correct_answer in the review parser. A live UI/database smoke test also requires the paused CMS migration and configured DeepSeek access.
