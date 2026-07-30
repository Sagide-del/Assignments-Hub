# Question Bank

Centralized, Platform-Admin-curated question bank. Replaces per-teacher AI
generation for the shared-content use case:

```text
PDF -> OpenAI generation -> QuestionBank rows (GENERATED)
    -> admin review -> approve (APPROVED) / reject (REJECTED)
    -> either:
       - publish to independent students (creates one Assignment via
         AssignmentsService.createIndependent)
       - browsed + selected by a teacher at an activated school (creates
         that teacher's own Assignment via AssignmentsService.create)
```

## Why this is a separate pipeline from `backend/src/ai-content`

`ai-content` (`AiContentArtifact`/`AiGenerationJob`) is inherently
per-school: every row carries a `schoolId`, quotas are counted per school
per month (`AiQuotaService`), and idempotency keys are scoped per school.
None of that fits a single admin generating one shared batch that many
schools read — forcing it through that pipeline would mean either
inventing a fake "owning school" for every global question, or bypassing
the quota/idempotency machinery for admin calls only, both worse than a
small, purpose-built pipeline. `QuestionBank` reuses what's actually
shared (the OpenAI provider router, `AssignmentsService`, PDF text
extraction) and leaves the school-scoped machinery alone.

`ai-content` is not deleted — see its own README — because deleting a
working, tested pipeline wasn't necessary to ship this, and it remains a
reasonable base for a possible future "let a teacher generate for their
own school only" feature without touching `QuestionBank` at all.

## Access control

- `PLATFORM_ADMIN`: full CRUD, generation, approve/reject, publish, school
  activation (`QuestionBankAdminController`, `/api/v1/admin/question-bank`).
- `TEACHER` / `SCHOOL_ADMIN`: read-only browse of `APPROVED` questions, and
  can create their own `Assignment` from a selection
  (`QuestionBankBrowseController`, `/api/v1/question-bank`) — but only if a
  Platform Admin has activated their school
  (`SchoolQuestionBankAccess.active`).
- `STUDENT`: no access — excluded from both controllers' `@Roles`, so the
  global `RolesGuard` rejects a student JWT before any handler runs.

## Grading

`AssignmentsService.validateQuestionConfigs` requires `config.numeric.
acceptedValue` (NUMERIC) / `config.shortAnswer.keywords` (SHORT_ANSWER)
before it will create any question of those types — `correctAnswer` alone
is not enough. `QuestionBankService.deriveConfig` computes this at
generation time and re-derives it on edit; a NUMERIC question whose
`correctAnswer` can't be parsed into a number is dropped from the batch
during generation rather than silently reaching the bank in an
unpublishable state.
