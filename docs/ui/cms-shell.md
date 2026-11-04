# Platform-admin CMS shell

The React Router pages live under `frontend/src/pages/admin/cms/`; this is a Vite app, so the `[id].tsx` filename is explicitly registered as `/platform/cms/review/:id`.

Routes:
- `/platform/cms`: Content Library with Drafts, Approved, Published to Store and Published to Schools tabs.
- `/platform/cms/create`: cascading grade, pathway, track, subject and topic selectors sourced from CurriculumTaxonomy.
- `/platform/cms/review/:id`: theory, inert 3D asset URL placeholders, the first three questions with answers, and an expandable list of remaining questions.
- `/platform/analytics`: explicit reporting-pending shell.

All pages use the existing `PLATFORM_ADMIN` ProtectedRoute and DashboardLayout, preserving authentication, the actual logo, school links and neutral sidebar styling. `cmsApi.ts` reuses Axios token refresh and the configured API base URL.

Current API boundaries:
- Drafts and Approved use GET `/cms/drafts` and filter by returned status.
- Store uses GET `/cms/store`; this is metadata only. Administrators open the protected module-detail endpoint for full content.
- Review uses protected GET `/cms/modules/:id`, including for school publications. It recognizes both legacy fields and the strict AI theory_text/question_text contract.
- Draft approval and store publication use the existing PATCH approval and POST publication endpoints. The preview requires theory and the grade-band question count (5, 10 or 30) before enabling its approval button.
- School publication uses POST `/cms/publish` and its tab loads protected GET `/cms/publications/schools`. The Publish modal loads real schools and grade-matching stream labels from learner profiles. Success shows a toast and returns to the corresponding dashboard tab.
- POST `/cms/drafts` now supports AI generation from grade, subject, topic and optional context. The create form now sends metadata only (no client content_json), preserves inputs on errors and opens the saved draft for review. The parser supports theory_text/question_text and the legacy fields. Generation never auto-approves or publishes the draft.
- Global reporting has no API contract yet; no analytics totals are invented.

Assets render in div placeholders, never image tags, embeds or remote model viewers. Lesson and question text is rendered as React text, without executing HTML from the payload. Missing answers and malformed JSON are shown explicitly.

Verification: `npm run test:cms`, Vite production bundling and Playwright checks with API fixtures. The five previously reported frontend type errors were fixed only after publishing verification. TypeScript and all pre-deployment checks are now blocking. The database migration remains pending; real API-backed use requires those tables first.

The canonical CMS URLs use the super-admin `/platform/cms` namespace. Previous `/admin/cms/*` links redirect inside the same PLATFORM_ADMIN guard, preserving query strings. The school-admin navigation and routes do not include CMS access.

Publishing is validated against HTTP fixtures and an isolated real PostgreSQL database. The additive 20261104090000_add_cms_master_library migration creates only the new CMS enum and tables. The opt-in cms.database.spec.ts verifies stored token usage, two stream delivery rows, concurrent idempotency and public payload filtering. No production database was used for this verification.
