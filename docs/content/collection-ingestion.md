# Curriculum Coverage & Ingestion

Open **Platform Admin → Question Bank → Curriculum ingestion**. The main Generate content button opens this workspace. The existing question library, subscribed-school access, independent practice and legacy generation/source tools remain available.

## Intake whole collections

Select Grades 6–12, name a collection and confirm source-use rights. Then choose one of:

- A whole folder in a supporting browser, or multiple PDFs/TXT/HTML files selected once. Uploads run sequentially; keep the page open until upload progress finishes. Classification and indexing are durable background jobs after each file is stored.
- A ZIP of documents: 50 MB compressed, 100 MB expanded, at most 200 archive entries; each supported document is at most 15 MB. Archive paths are never extracted to disk. Encrypted/unsupported compression, path traversal and oversized expansion are rejected. Other archive formats and office-document formats are not supported.
- A website directory or a newline-separated list of up to 30 URLs. KICD and KCSE Revision hosts are enabled. The worker follows qualifying subject/revision/design links to depth three, at most 60 links per page and 250 assets/pages per collection. Add further collections for larger sets.
- **Classify existing indexed sources · no re-upload**. This stages the existing source text for the same review workflow; it does not require original subject PDFs again. Up to 200 source IDs are submitted per API request, with client-side batching for larger selections.

Original uploaded documents are stored privately under `content-ingestion/`. The worker needs S3 PutObject/GetObject permissions for this prefix. Existing storage configuration is reused. Scanned PDFs use the existing Textract OCR service when configured; otherwise they remain explicit exceptions. Ordinary PDF text extraction does not require OCR.

Remote collection fetches require HTTPS, enabled exact hostnames, public DNS results, pinned connection addresses, valid TLS and bounded redirects/downloads/timeouts. `CONTENT_SOURCE_HOSTS` can enable additional authorised hostnames; this is not an unrestricted URL fetch endpoint. Login, paywall, anti-bot and disabled external-host restrictions are not bypassed. Directory pages are separated from teachable document content. An accessible directory does not guarantee all linked downloads are accessible.

## Review classification and provenance

The worker proposes document type, grade, subject, applicable senior pathway and exact source excerpts. It distinguishes:

- **Curriculum design:** establishes strands, sub-strands and specific learning outcomes, each supported by a quotation.
- **Teaching reference:** supplies explanations, examples and revision material; arbitrary textbook paragraphs are not promoted into official learning outcomes.
- **General framework:** proposes supported subject/grade structure, while leaving detailed outcome gaps visible.

Mappings are proposals until an admin reviews them. The editor uses normal grade/type/subject/evidence fields. Whole documents are staged up to 500,000 extracted characters. Curriculum/framework mapping processes text in 40,000-character segments; teaching references need only classification before their full staged text is indexed. Unsupported segments and intake limits are noted. A source reaching a limit is not represented as complete syllabus coverage. Legacy sources may contain only their originally indexed text.

Index reviewed documents in batches. Existing source hashing reuses indexed text. Curriculum outcomes have stable source-document IDs. Matching teaching references are suggested automatically by grade/subject, but reviewers must check relevance to each outcome. New references invalidate prior outcome review. Full collection browsing is paginated, so documents beyond the overview preview can still be reviewed. Failed work remains visible in both document review and Generation jobs and can be retried there.

## Establish the expected curriculum

Coverage is measured against an explicit expected subject catalogue, not just uploaded files. Propose subject rows from KICD discovery, index reviewed framework/design mappings, or paste a complete CSV/TSV catalogue:

```csv
Grade,Subject,Pathway
Grade 6,Mathematics,
Grade 6,English,
Grade 11,History and Citizenship,Social Sciences
```

These example rows are **not** a complete CBC catalogue. Supply the current official source/version in the authority field and confirm the complete list for the selected grades and applicable senior pathways. New subject rows reset the grade's catalogue verification. Incorrect empty catalogue rows can be removed; subjects with outcomes cannot be deleted through that action. The database restricts deleting source-linked outcome provenance.

A general framework, an AI classification, or a successful download does not certify a complete or current subject list. The UI keeps unverified/missing grade catalogues explicit. It imposes no shared Biology/Chemistry/Physics-only subject list; any reviewed grade-specific CBC subject/pathway can be represented.

## Generate from reviewed outcomes

The matrix shows expected subjects even when they have no resources. It separately reports curriculum designs, teaching references, outcome review/readiness, draft/approved questions and draft/published memory cards. Older unlinked content is preserved in the bank but is not counted as proof of mapped outcome coverage.

An outcome can generate content only when:

1. The grade's expected subject catalogue and subject scope have been reviewed.
2. The learning outcome is reviewed, with a source quotation present in a reviewed curriculum design.
3. Any optional teaching sources must be reviewed and match the exact grade and subject. A textbook is not required: reviewed curriculum evidence plus AI subject knowledge can generate drafts. The curriculum reference establishes alignment, not independent verification of AI facts or answers.

Generation jobs recheck these conditions when they run. They generate original questions and/or native recall cards into drafts, retaining curriculum outcome IDs and source-document IDs. Question jobs use the existing validated question generator in resumable 15-question chunks. Approved questions continue to feed rotating 30-question practice batches. This release does not auto-approve AI content or certify that a learner has mastered a practical competency.

## Operations and checks

Apply `20261029160000_curriculum_collections` and regenerate Prisma. The frontend readiness gate now requires content capability version 3, collection ingestion and outcome grounding. The new JSON body limit of 2 MB is scoped to the admin ingestion API; payment webhook parsing remains unchanged.

Verification includes schema validation/builds; ZIP bounds and path handling; host/private-address restrictions; real quotation checks; catalogue parsing; missing-material generation gates; existing-source reuse; outcome/source provenance; paginated review and false-completeness prevention. Browser fixtures exercise multi-file intake, structured mapping, review/index requests, non-science gaps, catalogue/outcome review, generation, reuse, website collection requests and mobile layouts. No live third-party material or production AI content is claimed to have been ingested by those fixture checks.

## Grade-wide student delivery

Independent student practice includes every subject in the reviewed catalogue for the student's profile grade, including subjects with no approved questions yet. Missing pools show “Content being prepared”; pools below 30 remain unavailable for a new batch. Existing unfinished attempts can still resume. Senior pathway and religious-education alternatives are available options, not a statement that every student must take every alternative.

For a grade-wide rollout: propose and review the official subject inventory, collect permitted online teaching material or uploaded/licensed books, review mappings and outcomes, then generate across the ready outcomes in Coverage & generation. Questions are stored centrally as drafts. Review and approve them in the question library; approved multiple-choice questions automatically enter the matching grade/subject practice pool. No separate student copy or manual assignment upload is required for independent practice. School teachers retain their existing subscribed-bank selection workflow. A missing source or inaccessible website remains a coverage gap; this workflow cannot obtain inaccessible books or guarantee complete subject coverage without reviewed source material.

## Curriculum-led assessment and retention design

Default generation creates 30 MCQs per selected outcome; this is a requested target, not a promise of 30 approved items. Partial/failed jobs and pending review remain visible. All reviewed subjects in Grades 6–12 use the same outcome-linked pipeline; no content is claimed to exist merely because a subject is listed. Supporting notes/books are optional. The separate Written response / composition format generates short answers and essays for reviewed teacher assignments, not auto-marked practice.

The English blueprint was informed by the user-supplied five-page Grade 6 Jesma 006 sample: dialogue cloze, passage comprehension and inference, vocabulary in context, connected cloze, grammar and a separate composition. No sample passages, questions or publisher branding are reproduced. Each generated passage-dependent item contains its own original passage because practice shuffles individual questions. The blueprint adapts language and reasoning to Grades 6, 7–9 and 10–12, while the actual reviewed outcome determines which components apply. It is not a claim of an official exam format.

Across subjects the generation instructions emphasise varied retrieval, understanding and application, misconception-based distractors, independent answer checking and explanations that teach reasoning. Recall cards request retrieval, misconception and transfer checks. The learner UI suggests revisiting after 1, 3, 7 and 14 days; this is study guidance, not persisted scheduling or a retention guarantee. These prompt instructions do not constitute factual verification or guarantee novelty against the entire internet. Existing validation, duplicate checks and manual approval remain necessary.
