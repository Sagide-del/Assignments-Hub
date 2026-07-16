# JSON Exam System — Setup & Test Guide

This covers getting the new JSON-based exam system running and verifying it end-to-end.
It also includes the earlier per-student subscription pricing change, since that migration
is still pending too — do both in the same pass.

## 1. Apply the database migrations

Two migrations are waiting, in this order:

1. `20260715000000_subscription_pricing_tiers` — School.type, per-student pricing snapshot fields
2. `20260715010000_json_exam_sections` — Section table, Question.sectionId, Assignment exam metadata, Submission draft/timing fields

From `backend/`:

```bash
npm run prisma:migrate
```

This runs `prisma migrate dev`, which applies both pending migrations in timestamp order and
regenerates the Prisma client. If you're deploying to a server instead of running locally, use
`npm run prisma:deploy` (`prisma migrate deploy` — non-interactive, no schema drift check).

If `prisma migrate dev` complains about drift or asks to reset, stop and check your database
first — don't accept a reset on a database with real data in it.

## 2. Regenerate the Prisma client (if you skipped step 1's auto-generate)

```bash
npm run prisma:generate
```

## 3. Restart the backend

```bash
npm run start:dev
```

Watch the startup log for errors. If TypeScript compilation fails, it's almost always because
the Prisma client wasn't regenerated after the schema change — rerun step 2.

## 4. Restart / reload the frontend pages

The teacher and student dashboards are static HTML — just hard-refresh the browser tab (or
restart whatever static server serves `frontend/`). No build step.

## 5. End-to-end test walkthrough

### A. Upload the sample exam as a teacher

1. Log into the Teacher Dashboard, go to the **Create** tab.
2. Click **Upload JSON Exam** (next to Manual Builder).
3. Click **Download Example (Grade 7 Maths)** to grab `grade7_mathematics_exam.json`, or just
   drag that file in directly from `frontend/shared/grade7_mathematics_exam.json`.
4. Drop it on the upload zone. You should see a green "Looks good — 100 total marks" box and a
   structured preview (5 sections, 17 questions).
5. Click **Publish Assignment**. You should land back on the Assignments tab and see it listed
   as Published, Grade 7, Mathematics.

**Also test the failure path:** edit a copy of the JSON to break something (e.g. delete a
`correctAnswer` from a MULTIPLE_CHOICE question, or set `totalMarks` to a wrong number) and
re-upload — you should get a red box listing the specific error(s) instead of a silent failure,
and the Publish button should stay hidden.

### B. Take the exam as a student

1. Log in as a Grade 7 student.
2. Open the assignment — you should see the full exam UI: header with subject/grade/time
   allowed/marks, instructions, a sticky status bar (timer counting down from 90:00, progress
   0/17, "Saved" indicator), and all 5 sections.
3. Answer a few questions of each type: click an MCQ option (A–D), toggle a True/False, type in
   a fill-blank, pick matches from the Matching dropdowns, drag-reorder the Ordering list, and
   type into an Essay box (try the bold/italic toolbar, and expand "Working space").
4. Wait ~3 seconds after typing — the autosave indicator should briefly show "Saving..." then
   "Saved". Refresh the page and reopen the assignment: your answers should still be there
   (this confirms both the server-side DRAFT save and the IndexedDB local cache are working).
5. Click **Submit Assignment** — you'll get a confirmation dialog (it'll warn you about
   unanswered questions if any remain). Confirm.
6. You should land on a read-only result view: MCQ/True-False/Fill-blank/Matching/Ordering
   answers are already auto-graded; essay questions show "Pending manual grading".

### C. Grade the essays as a teacher

1. Back in the Teacher Dashboard, go to **To Grade** — the submission should appear.
2. Open it. Auto-graded questions show a green/red "Auto-graded: Correct/Incorrect" line;
   essay questions show the student's answer with a "Pending manual grading" badge.
3. Enter points and optional feedback for each essay question, add overall feedback, and
   **Save Grade**.
4. Log back in as the student — the assignment should now show as Graded with the total score
   and your feedback visible.

### D. Sanity-check the report card

Open the student's report card (or the teacher/admin equivalent) and confirm the exam appears
once, with the correct score — not duplicated, and not showing up while it was still a draft.

## 6. Things worth knowing

- **Manually-built assignments still work unchanged** — the same student-side exam renderer
  handles both JSON-uploaded exams and the older question-builder form; assignments without
  sections just render as one flat list of questions.
- **Time spent / timer** is wall-clock since the exam was first opened (or first drafted), not
  active-focus time — it's informational only and never affects grading or lateness.
- **MATCHING and ORDERING answers** are stored as JSON strings in the existing `correctAnswer`/
  `studentAnswer` text columns (no schema change needed for those two types) and compared
  structurally, not as raw text.
- If a teacher re-uploads a corrected JSON file, it creates a **new** assignment — there's no
  "update in place" for JSON uploads yet. Delete the old one from the Assignments tab if it was
  a mistake.
