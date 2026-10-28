# Curriculum library

Platform administrators can open **Curriculum Library** (`/platform/curriculum-library`). This adds a source-led assignment production workflow to the existing AI services without changing school assignment workflows.

1. Choose Grade 1–12, enter the subject/learning area and upload its curriculum design PDF (up to 15 MB). Upload each grade/subject separately. Use official or permitted materials. Scanned PDFs use the existing OCR service.
2. The existing extraction queue identifies strands, sub-strands, specific learning outcomes and source excerpts. Check the displayed structure against the PDF; missing outcomes are explicitly flagged. Older extractions can still be browsed but may need uploading again to extract outcomes.
3. Confirm the structure review, choose 5–20 questions per unit, and choose Generate missing / retry. Units correspond to extracted sub-strands, or the topic when no sub-strands exist. Requests are admitted in batches of 20 through the existing quota and queue services. Keep the page open while requests are being queued; after acceptance, generation runs in the background. Return to the document to inspect progress or resume missing work.
4. Review a draft, edit its questions, options, correct answers and worked explanations, save edits and validate/approve. Editing clears approval. Structural validation cannot establish factual accuracy or prove every outcome has been assessed.
5. Select approved assignments and explicitly publish them to independent learners. They are created as unpublished AUTO_MARKED drafts in the existing INDEPENDENT school collection, then released through the existing assignment service. Student grade filters continue to apply. Source-school assignments are not redirected.

This version generates original mixed-difficulty MCQ/true-false practice and explanations. It does not scrape online sources, copy textbooks, automatically build lessons/3D labs, claim KNEC endorsement or mark curriculum coverage complete merely because a draft exists. A curriculum blueprint may lack sufficient detail; reviewers should use authoritative teaching references when checking content.

## Operations

Existing configuration is reused: `DEEPSEEK_API_KEY`, model selection, global AI / assignment feature flags, source storage, school feature configuration and quotas. The AI Management link opens the existing feature controls. A durable production worker needs the existing `REDIS_URL`/BullMQ setup; without Redis the current local queue is non-durable. Failures and quota errors remain visible, and failed attempts can be resubmitted. Repeated requests for queued/running units or units with existing drafts avoid generating a second set.

Extraction now preserves explicit `learningOutcomes` in JSON and generated artifacts retain source extraction/topic/subtopic IDs. No database migration is required. PDFs exceeding the extraction text limit fail with split-document instructions rather than silently losing the remainder. Duplicate question text and duplicate MCQ options are rejected. Worked explanations also populate the assignment's normal explanation field for released result review.

`GET /ai/curriculum-capabilities` is a public version check with no content or credentials. The frontend workflow waits for this API before publishing and runs AI-content tests in addition to the existing checks.

## Validation

Backend tests cover batch limits, review attestations, curriculum membership, missing/failed/queued handling, quota errors, deterministic generation keys, independent publishing, grade validation, source traceability, answer explanations and duplicate validation. Existing AI security/guard/controller tests are retained. Browser checks exercise the admin workflow using API fixtures; they do not call the paid AI provider or prove a live production generation. Production API credentials and service configuration must be active for real document processing.
