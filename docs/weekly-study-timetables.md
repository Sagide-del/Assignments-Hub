# Weekly study timetables

Student → My Study Hub → Timetable. Direct route: `/student/study-hub/timetable`.

## Evidence and generation

The plan uses current-grade structured report marks (`StudentAcademicResult` from completed imports), released graded assignments, completed scored timed mocks, external mock marks and measured Learning Coach diagnostics/mastery. Grade/pathway taxonomy and authorised published modules supply subjects/topics. It does not OCR report-card uploads: private uploaded file references alone are not marks. Missing evidence produces a labelled balanced starter plan.

Only an explicit Generate action calls the configured AI router. Reading, logging in, downloading, sharing, marking completion and taking recall quizzes do not generate AI content. A student's current Nairobi Monday is unique; regeneration updates that week, while new weeks get new records. History stays available. Generation has a per-student lease, five-minute refresh cooldown, default five-generation weekly cap and instance concurrency bound. Optional `TIMETABLE_MAX_GENERATIONS_PER_WEEK` accepts 1–10.

The server creates a bounded schedule first. DeepSeek can personalise short session activities, but cannot change validated times, subjects, topic assignments, techniques or authorised quiz links. Invalid JSON/structure retries once; provider failure or exhausted credit uses the deterministic validated template. Each request has a 45-second timeout, no hidden SDK retries and a 10,000-token output ceiling. The UI identifies AI-assisted versus structured plans.

## Scheduling

Time zone: Africa/Nairobi. Weekdays 16:00–21:00; weekends 09:00–17:00. Windows include school/personal time, not continuous compulsory study. Weekdays target three focus cycles and weekends six split between morning and afternoon, reduced if school commitments collide. Each focus cycle is 20 minutes study plus five minutes active recall. Rest is five minutes, extended to 15 after two cycles; a 15-minute reward follows every third cycle. Topics are interleaved and measured weak subjects get extra allocation. Priority topics receive 1-, 3- and 7-day reviews, with future/overdue reviews carried forward when capacity requires it. Creating a plan midway through a week does not backdate new study sessions; regeneration preserves past days.

No existing school timetable table existed. The additive `Study_School_Schedule` supports optional reservations via `PUT /study-hub/school-schedule` for the authenticated school admin's school only. Body: `{ grade: "Grade 11" | "ALL", stream: "1B", blocks: [{ day: "Monday", start: "16:00", end: "17:00", label: "School club" }] }`. Maximum ten reservations per day, 70 total. Without reservations, the UI labels default windows. This release does not add a school schedule editing screen.

## Privacy, quizzes and progress

Every private endpoint derives student and school from the authenticated session. Another learner's timetable returns 404. Teacher access to student-only routes returns 403. Progress writes are row-locked, revision checked and learner-reported; they never change academic, SBA or CSL marks. Concurrent regeneration preserves matching session completions.

Recall links use eligible self-contained multiple-choice questions from currently authorised published MasterModules. Access is checked again on every quiz request. Questions requiring missing passages/diagrams are excluded. GET omits correct answers and explanations; submission returns marked feedback. Where no eligible module exists, the UI offers three clearly labelled self-recall prompts instead. Quizzes require no AI calls.

PDF generation uses packaged Chromium/Puppeteer, embeds Assignment Hub branding and the school's logo when available, escapes learner text and blocks external browser network requests. `TIMETABLE_CHROMIUM_EXECUTABLE` is an optional local override. PDFs contain a colour-coded week, study guide and carried-forward reviews. Sharing sends the PDF file through Web Share when supported; otherwise it downloads for attachment. No public private-data share URL is created.

## API

- `GET /study-hub/capabilities`: public, schema-backed version 1.
- `GET /study-hub/timetable`: current week, identity and saved history; no AI.
- `POST /study-hub/timetable/generate`: optional `{ regenerate: true }`.
- `GET /study-hub/timetable/:id`: own saved plan.
- `PATCH /study-hub/timetable/:id/progress`: `{ block_id, completed, revision }`.
- `GET` / `POST /study-hub/timetable/:id/quiz/:blockId`: own published recall quiz; POST `{ revision, answers: [{ question_index, answer }] }`.
- `GET /study-hub/timetable/:id/pdf`: private branded PDF.
- `PUT /study-hub/school-schedule`: school admin reservations.

## Migration and verification

Migration `20261105020000_study_timetables` only adds the timetable/school-schedule tables, relations, indexes and Monday/count constraints. No M-Pesa, teacher RBAC, SBA or CSL source logic is changed.

Tests cover allocation, recalls/rewards/rest, windows, Kenya dates, review carry-forward, conflicts, strict AI validation/fallback, cache/unique weeks, own-student isolation, progress revisions, quiz access and answer privacy, school admin boundaries and actual branded PDF output. Production publishing waits for the new schema-backed capability and checks anonymous/teacher denial without creating production study plans.
