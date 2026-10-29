# Central content workspace

The admin Question Bank is the main shared repository. Its primary tabs are Questions, Create content, Generation jobs and Memory cards. School access and source/collection tools are in the collapsed Advanced tools & school access section. The sidebar keeps ten primary destinations; the former AI, curriculum, PDF-card, tutor and authored-assignment routes remain accessible through contextual or advanced links. Existing authored assignments and legacy PDF cards are preserved.

## Populate Grades 6–12

1. Open **Question Bank → Generate content**, then choose a grade.
2. Follow **Set up curriculum**: discover official designs, confirm the selected links, check document mappings, verify the expected subject list and review quoted learning outcomes. Existing indexed sources can be reused without original PDFs. Missing/inaccessible material remains visible.
3. Continue to **Generate content**. Select all ready subjects or one subject. The starter preview shows the requested total before any generation starts. Notes and books are optional; reviewed curriculum defines scope while AI creates original draft questions and explanations.
4. Follow **Review & publish** to inspect that grade’s draft questions, generation progress and memory cards. Answer checks, explanations and visuals still need review. Approved valid MCQs automatically feed independent practice once 30 are available; cards have a separate publication action. School teachers retain subscribed-bank selection controls.
5. Open **Advanced tools & school access** for collection uploads, curriculum corrections, older official-source tools and school activation. Existing authored assignments and legacy PDF cards are preserved.

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

## Bulk grade setup

Select Grades 6–12 once in Curriculum sources. The grade table lists subjects actually discovered or indexed for each grade, rather than applying a shared subject list. Discover KICD subjects or upload one saved directory. Numeric and word grade labels (including Grade Six) are recognised. Review the combined mappings once, correct uncertain entries, then choose **Import all confirmed designs**. Already indexed and queued documents are skipped under a database lock, including duplicate rows in one request.

Generation defaults to **All indexed sources in selected grades**; individual selection is optional. **Generate questions & cards** queues both content types for every selected source. A request supports up to 200 sources; generated questions and cards remain drafts. Grade 6 is also supported in the independent 30-question practice allocator and card filters. Existing KJSEA-specific grade selectors retain their assessment scope.

The public content capability is version 2 and includes Grade 6 and bulk-curriculum support. The frontend deployment gate waits for that version. No new database migration is required for this extension.

## Collection ingestion and outcome coverage

The main content entry point is now **Curriculum ingestion**. See [collection-ingestion.md](collection-ingestion.md) for folder/ZIP/website collection intake, expected-subject catalogues, curriculum versus teaching references, exact outcome quotations and the coverage matrix. Existing official-source tools remain available. The deployment capability is version 3.
