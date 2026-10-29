# Central content workspace

The admin Question Bank is the main shared repository. Its tabs are Questions, Curriculum sources, Generation jobs, Memory cards and School access. The sidebar keeps ten primary destinations; the former AI, curriculum, PDF-card, tutor and authored-assignment routes remain accessible through contextual or advanced links. Existing authored assignments and legacy PDF cards are preserved.

## Populate Grades 7–12

1. Open **Question Bank → Curriculum sources**.
2. Discover official KICD subjects, or upload the saved KICD HTML directory. Discovery reads links, not executable HTML. It follows at most six grade design directories and lists official PDF candidates. Only HTTPS KICD hosts and same-host redirects are accepted; responses have time/size limits.
3. Review each candidate's grade and subject, then import selected PDFs. The importer confirms the grade in extracted PDF text before indexing. Inaccessible, externally hosted or unconfirmed documents produce explicit failures. A general framework is not relabelled as a subject design. The legacy curriculum library remains available for framework/extraction workflows.
4. Select indexed sources across grades and subjects, choose a question count and optionally a topic focus, then queue questions or memory cards. Requests use the source's actual grade and subject. Draft questions remain in the central bank for review; generation does not publish or unlock a school automatically.
5. Review answers, explanations, options and visuals. Edit before approval. Questions with missing referenced figures or invalid MCQ options cannot be approved. An assignment selection must belong to one grade and subject.

Question jobs run in 15-question chunks using stable generation IDs. Completed chunks survive retries and avoid repeated generation. Exact normalized question duplicates in the source pool are excluded. Provider output may contain fewer usable questions than requested; the job shows the actual count. The current retrieval window and extracted-text size limits remain in effect, so one generation request is not a certification of complete syllabus coverage.

Charts, tables, simple triangles and process cycles can be generated from validated structured data; labels are escaped and rendered by application code rather than accepting arbitrary model SVG. Other authored rich content passes through the existing sanitized renderer. Unsupported or missing figures still need editorial correction/regeneration; arbitrary photorealistic illustration generation is not included.

Jobs are stored in PostgreSQL and atomically claimed by a background poller. Work continues after the admin closes the page. Heartbeats retain live work; interrupted jobs become retryable failures after ten minutes. Question chunks and generated card batches have stable provenance for retries. Review partial output before retrying failed work.

## Independent practice

My Assignments shows subject practice only to activated independent students. A subject must have at least 30 approved, valid four-option MCQs. Other question types remain available for authored assignments.

The server derives the learner's grade from their authenticated profile. It snapshots 30 questions into the existing private assessment ledger and reuses its answer-saving, grading, ownership and review rules. Answers/explanations are withheld until submission. Existing unfinished practice is returned instead of issuing a new batch. Practice drafts cannot be discarded through the mock API to bypass rotation.

A PostgreSQL advisory lock serializes allocations per grade/subject across server instances. A partial unique index prevents duplicate open batches per learner, subject and grade. Allocation prefers unseen questions, then reduces overlap with other recent active batches, then chooses least-used/older repeats. There are no duplicate IDs within a batch. Complete isolation between students cannot be guaranteed once the pool is too small; inactive reservations stop influencing overlap after 24 hours, while the owner's unfinished batch remains resumable. A completed learner can choose the next batch. Teacher assignments are not rotated or modified.

## Subscribed schools

School teachers/admins must have both explicit Question Bank activation and a latest ACTIVE subscription whose expiry has not passed. Suspended, expired or unactivated schools cannot browse/select/rotate the shared pool. Platform admins retain preview access. Student roles cannot directly browse the bank or its answer keys.

## Native recall cards

Memory-card jobs use indexed curriculum material and generate one-concept cues, a meaningful memory aid, component-to-fact mappings, an explanation and at least two retrieval checks. Up to twelve cards are generated per source/job for review. No manual PDF or image is needed. Generated cards are drafts; admins can edit, preview and publish selected cards across the selected sources' grades. The student API exposes only published, matching-grade/shared cards, and fails closed when a student has no grade.

Students try the cue, reveal the aid, check retrieval answers, and choose to review again or mark the current recall as remembered. These controls are session-local; this release does not claim a persistent spaced-repetition scheduler. Existing downloadable PDFs continue to work.

## Deployment and verification

Apply `20261029120000_central_content_library` and regenerate Prisma. The frontend workflow checks `/content-library/capabilities` before publishing. The capability response confirms the new job/card schema and the 30-question contract. No live provider credentials or subscription records are changed by this release.

Tests cover official URL restrictions, escaping and visual bounds, card structure and publication checks, student-grade filtering, school subscription enforcement, 30-question ranking/resumption, private snapshot creation, insufficient pools, queued work and worker claims. Browser checks use fixtures to exercise pagination, SVG previews, editing/approval, multi-source generation requests, import review, native-card publication/recall, mobile widths and the independent-practice entry. These checks do not certify live KICD availability, AI output quality or production deployment completion.
