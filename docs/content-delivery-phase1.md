# Phase 1: cheat sheets and published module batches

This release implements Phase 1 only. Student Library grouping/search/Puppeteer downloads (Phase 2) and the Python math engine (Phase 3) are deliberately deferred until separate approval.

## Storage and generation

Migration `20261105070000_cheatsheet_batch_rotation` adds `MasterModule.batch_number` (positive integer, default 1) and `theory_cheatsheet` (JSON, default empty object for historical rows). Historical modules are numbered by grade/subject/topic in creation order. A PostgreSQL advisory lock, insert trigger and unique index assign subsequent batches safely across concurrent generators. Numbers include drafts and other publication audiences, so a learner's eligible sequence may have gaps.

New generation and enrichment prompts request structured key concepts, formulas, common mistakes and a concept map, instead of a theory paragraph. The payload is validated before storage. The concept map uses a restricted TikZ node/arrow dialect: only bounded coordinates, plain text labels and declared-node edges are accepted. Browser SVG renders this inert structure locally; no TeX, shell commands, remote compiler or uploaded illustrations are executed. Existing question illustration validation/rendering is untouched.

The same validated sheet is stored in the new column and the generated content payload. A readable key-concept text projection keeps existing consumers compatible. Legacy paragraph responses and existing modules remain readable and are labelled as legacy theory rather than fabricating a cheat sheet. Existing grade-band question counts remain unchanged. Generation token accounting and human review/publication remain in place.

## Rotation

`GET /student/next-batch/:subject/:topic` is authenticated, student-only and private/no-store. It derives the learner's current grade/pathway/track and publication audience using the existing scope helper. Only authorised published ASSIGNMENT modules containing questions are candidates. The lowest unfinished batch is returned as metadata plus a validated cheat sheet, never question answers.

The repository has no `Student_Progress` table. Submitted/completed `Submission` records linked through `Assignment.rawJson.cms_module_id` are the authoritative completion source. Drafts and other learners' submissions do not count. Reading the endpoint neither generates AI content nor writes progress. All eligible batches completed returns `mastered: true` and an unfinished published topic suggestion when one exists; the UI says "All published batches completed" rather than claiming score-based mastery. No available published batch returns `unavailable: true`, not mastery.

In the existing CMS-backed assessment view, the structured sheet replaces the paragraph panel when available. After submission, "Continue to Next Batch" checks rotation, then opens the selected module through the existing materialisation/assessment engine. Bank-generated practice retains its separate existing rotation. The admin review view also previews the sheet. Printing opens an isolated print view while preserving the exam workspace and saved work.

## Verification and rollout

Tests cover strict JSON and inert diagram parsing, rejected file/shell commands, concurrent sequential numbering, Batch 1 → Batch 2, drafts/other learners/private schools excluded, all-batch completion, curriculum/role access, safe materialisation and shared frontend validation. Browser checks exercise the rendered sheet, formula/mistake sections, print isolation and next-batch navigation.

The full backend suite uses disposable `rbac_test` and fully migrated `cms_publish_test` databases. Deployment readiness checks the new columns, batch-number trigger and unique index. No M-Pesa, Teacher RBAC, SBA, CSL or existing illustration source files are changed.

Per the requested phase gate: stop on the first failing test. If all checks pass, release Phase 1 for manual verification and wait for approval before any Phase 2 work.
