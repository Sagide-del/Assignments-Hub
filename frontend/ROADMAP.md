# Frontend Roadmap

## Status: all planned screens built, wired to real backend endpoints

Every route in the app calls a real controller in `backend/src/*.controller.ts` — there is no mocked data and no button that silently does nothing. Where the backend doesn't support something in the original brief, that's called out explicitly below and in-code, rather than faked.

### Auth & shell
- Student login, staff login, hidden `/platform-console` Platform Admin login. JWT + refresh-token rotation (`src/api/axios.ts`).
- Role-based routing (`ProtectedRoute`), responsive `DashboardLayout` (mobile hamburger + desktop sidebar) pulling each school's name/logo live.

### Student
- Dashboard: assignment list.
- `ExamPlayer`: full exam-taking flow — loads questions (answers stripped server-side), renders per question type (multiple choice, true/false, fill-blank, essay, matching/ordering, file upload via `/uploads/single`), autosave draft, final submit, read-only graded view afterward.
- `StemLabs`: labs catalog + quiz completion (`/lab-sessions`), CSL activities + evidence/reflection submission (`/csl-submissions`).
- `CareerPathways`: explore pathways/tracks, recommendation quiz (`/pathways/recommendations`), track selection with notes, history, PDF report download.
- `SupportNeeds`: self-assessment form (`/support-needs/assessments`), institution directory.
- `Reports`: report card (`/reports/student/:id`).

### Teacher
- Dashboard: JSON-upload assignment creation (validate + publish), assignment list.
- `CreateAssignment`: manual question-by-question builder (`POST /assignments`), including the real `notifyParents` SMS-on-create checkbox.
- `Marking`: per-question grading UI (`PATCH /submissions/:id/grade`).
- `CslReview`: approve/send-back CSL submissions.
- `PathwaysStats`: school-wide pathway selection stats (raw data view — see below).

### School Admin
- Dashboard: bulk Excel import (teachers/students), live subscription pricing.
- `Branding`: logo upload + contact info (only fields the backend actually has — see gap table).
- `IntaSendCheckout`: starts a real IntaSend checkout session.
- `Reports`: users/assignments/labs/financial aggregate reports.

### Platform Admin
- School creation (with a manually-entered code — see gap table) and school directory.

### Parent
- Honest "coming soon" placeholder — no backend support exists.

## Known limitations (deliberate, not oversights)

**Raw JSON views**: `PathwaysStats`, `SchoolAdminReports`, and `StudentReports` render their API responses as formatted JSON rather than custom charts/tables. `ReportsService` and the pathways/support-needs stats endpoints don't have documented response contracts anywhere in the backend, so guessing field names and building a polished chart around them risked silently showing wrong numbers. The data is real and complete; only the presentation layer is unfinished. Building proper visualizations is a good next step once the response shapes are confirmed against a running backend.

**Question-type coverage in the exam player**: MATCHING/ORDERING questions use a plain text input rather than a drag-and-drop UI — functionally correct (the backend compares the JSON-encoded string), just not the nicest UX yet.

## Corrected assumptions (found while wiring against the real backend — fixed, but worth knowing)

- **School branding fields**: the `School` model only has `logoUrl` — there is no `motto` or `brandColor` column. The original brief describes per-school motto/color theming; that needs a Prisma migration (add the columns + update `create-school.dto.ts`/`update-school.dto.ts`) before the frontend can persist or display it. `Branding.tsx` and `DashboardLayout` were built to only touch fields that exist.
- **School codes are not auto-generated.** `POST /schools` requires `code` as a required input (unique, `/^[A-Z0-9]+$/`, 3-20 chars) — `SchoolsService.create` just persists whatever is passed. `PlatformAdminDashboard` suggests a candidate code client-side (editable before submit) rather than pretending the backend generates one.
- Submission/answer/grading field names (`pointsAwarded`/`feedback` not `marksAwarded`/`comment`; lab-session/CSL-submission answer shape is `{questionId, answer}` not `{questionId, studentAnswer}`) were fixed to match the actual DTOs after cross-checking each one directly.

## Known backend gaps (do not build fake frontend for these until backend work lands)

| Feature in the original brief | Backend reality | What's needed |
|---|---|---|
| Parent Portal / parent login | No `PARENT` role exists (`schema.prisma` Role enum: PLATFORM_ADMIN, SCHOOL_ADMIN, TEACHER, STUDENT only). No parent-scoped endpoints. | New role, login endpoint (likely phone/OTP or linked-to-student), parent-scoped read access. |
| Self-service school registration wizard | `POST /schools` is PLATFORM_ADMIN-only, and `code` must be supplied by the caller (see above) — there's no public "sign up your school" flow. | Either keep it sales-assisted (current behavior) or add a public registration endpoint with server-side code generation + a verification/approval step. |
| School motto / brand color personalization | `School` model has no `motto`/`brandColor` columns — only `logoUrl`. | Prisma migration adding the columns, DTO updates, then wire `Branding.tsx` + `DashboardLayout`/`schoolTheme.ts` (both already structured to make this a small change once the fields exist). |
| AI Assignment Assistant | No AI generation endpoint anywhere in `assignments` module — only manual create and JSON import. | An endpoint that calls an LLM to draft questions/rubric from subject/grade/strand inputs, teacher reviews before publish. |
| Automatic parent SMS on assignment publish/completion | Partially real: `CreateAssignmentDto.notifyParents` DOES trigger an SMS blast on manual assignment creation (wired in `CreateAssignment.tsx`). There is no equivalent hook on JSON-uploaded assignments or on submission/grading events. | Extend the JSON-upload path and `SubmissionsService` to call `SmsService` the same way. |
| "Starter / Professional / Enterprise" manually-chosen plan | Real tiers are Free/Starter/Standard/Premium/Enterprise, auto-resolved from live student count + day/boarding rate (`backend/src/common/config/plans.ts`) — not manually picked. | Already reflected correctly in `SchoolAdminDashboard` and `IntaSendCheckout`. |

## Explicitly not touched

Per the brief's own rule, nothing in `backend/` was modified. Every `src/api/*` module and every DTO-shaped request body was written by reading the actual controller/DTO source, not by guessing.
