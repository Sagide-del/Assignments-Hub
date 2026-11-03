# Platform-admin CMS shell

The React Router pages live under `frontend/src/pages/admin/cms/`; this is a Vite app, so the `[id].tsx` filename is explicitly registered as `/platform/cms/review/:id`.

Routes:
- `/platform/cms`: Content Library with Drafts, Approved, Published to Store and Published to Schools tabs.
- `/platform/cms/create`: grade, subject, topic and pathway generation form.
- `/platform/cms/review/:id`: theory, inert 3D asset URL placeholders, the first three questions with answers, and an expandable list of remaining questions.
- `/platform/analytics`: explicit reporting-pending shell.

All pages use the existing `PLATFORM_ADMIN` ProtectedRoute and DashboardLayout, preserving authentication, the actual logo, school links and neutral sidebar styling. `cmsApi.ts` reuses Axios token refresh and the configured API base URL.

Current API boundaries:
- Drafts and Approved use GET `/cms/drafts` and filter by returned status.
- Store uses GET `/cms/store`; this is metadata only. Published summaries never fabricate question payloads.
- Review locates modules in the existing lists. There is no invented GET `/cms/:id` request.
- Draft approval and store publication use the existing PATCH approval and POST publication endpoints. The preview requires theory and 30 questions before enabling its approval button.
- School publication has a POST endpoint but no listing/detail endpoint. Its tab explicitly says that the list is not connected, rather than showing a misleading empty result.
- No CMS AI-generation endpoint exists yet. The form retains its visible selections and explains that generation is pending; clicking Generate with AI makes no paid request, creates no fake questions and saves no empty module.
- Global reporting has no API contract yet; no analytics totals are invented.

Assets render in div placeholders, never image tags, embeds or remote model viewers. Lesson and question text is rendered as React text, without executing HTML from the payload. Missing answers and malformed JSON are shown explicitly.

Verification: `npm run test:cms`, Vite production bundling and Playwright checks with API fixtures. Existing unrelated TypeScript errors, including BookOpenCheck in MyResources, are intentionally unchanged. The database migration remains pending; real API-backed use requires those tables first.

The canonical CMS URLs use the super-admin `/platform/cms` namespace. Previous `/admin/cms/*` links redirect inside the same PLATFORM_ADMIN guard, preserving query strings. The school-admin navigation and routes do not include CMS access.
