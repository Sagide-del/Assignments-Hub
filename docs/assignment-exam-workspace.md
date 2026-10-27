# Assignment examination workspace

The standard assignment player (`/student/assignments/:id`, including The Mole) now has a compact sticky header, answered progress, collapsible numbered navigator, browser-persisted review flags, a larger answer editor and a stable action bar. The navigator starts closed below 1280px. Focus mode hides platform navigation and can request browser fullscreen; it is a distraction-reduction feature, not secure proctoring. Returning from another tab does not pause a timed assessment.

Chemistry/science responses expose relevant notation; numeric and mathematics responses retain mathematical functions. Language responses do not show a mathematics toolbar. Essay photo attachments remain available. Uploads block submission until completion. Teacher instructions remain expandable, and released results retain their existing answer review and learning reflection.

## Persistence and timing

`useAssignmentDraft` serialises draft and final requests to the existing assignment submission endpoint. Edits debounce for 800ms, have a learner/assignment-scoped best-effort local backup, and are restored after reload. A saved indicator requires an acknowledged response containing the submitted values. An older acknowledgement cannot replace text typed while it was in flight or mark newer text saved. Offline work is labelled unsynced; reconnect retries, and explicit save/retry remains available. Submission freezes edits, waits for queued writes, and requires confirmation except when the configured time expires.

A timed assessment starts with an acknowledged server draft. The countdown uses persisted `startedAt`, the teacher's `timeAllowedMinutes`, and server clock metadata. Reload does not restart it. Untimed assessments say Untimed rather than inventing a time allowance. The backend rejects drafts after the deadline; finalising after expiry grades the server's previous saved answers, ignoring late payload edits. Existing timed drafts retain their original start time, so an old draft can already be expired when reopened. No schema migration is needed.

Draft answer replacement is a nested atomic database update, conditioned on DRAFT status. A final attempt cannot be overwritten by a later draft update. Browser backup is not cross-device storage; connectivity/storage failures are shown. Flags are browser-local and do not affect marking. Actual answer validation and release permissions stay on the backend.

Deployment waits for `assessmentWorkspaceVersion: 2` on the existing public readiness probe before publishing the frontend, and runs submission deadline/privacy tests alongside the mock-test backend suite.

## Validation

Both builds, the existing 37 frontend checks, 27 mock backend tests and eight submission tests (including five new timer/update tests) pass. A local Playwright fixture exercises a 34-question Mole flow: different question editors, slow acknowledgement during further editing, confirmed autosave, offline backup/reload/retry, flags, focus mode, collapse, submit/cancel, no timer reset, automatic expiry finalisation and widths 320/390/768/1024px. These are local fixtures; no real learner answers are submitted during verification.
