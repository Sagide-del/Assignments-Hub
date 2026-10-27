> UI update, 27 October 2026: supplementary learning-outcome panels and guide links have been removed from student assignment, skill and STEM working screens to reduce clutter. The dedicated My Resources learning guide, authored lesson content and existing saved evidence remain available. The implementation notes below describe the original framework structure.

# Framework-based learning structure

Source read: Kenya Institute of Curriculum Development, *Basic Education Curriculum Framework*, 2017, supplied by the user as CURRICULUMFRAMEWORK.pdf (145 PDF pages). The edition is printed on the title page. It is a foundational framework, not evidence that a current 2026 grade/subject design or rationalised subject list has been verified.

PDF SHA256: `75d8742bc3bcb55cc6f7cd8c80f28e7f977d51ee8e9aac7460b774c8850af843`

The separately supplied CBC MATERIALS HTML was inspected as a directory. Sixty unique CBC category/resource links were extracted. No linked subject-design PDFs were available. Official links in the interface use the navigation paths from that saved HTML; availability and current contents have not been verified online.

## Source-to-product mapping

| Framework source (PDF page = printed page) | Product structure |
| --- | --- |
| Seven core competencies, p. 21 | Shared competency taxonomy, selected against activities rather than automatically marking all seven achieved |
| Early-years outcomes, p. 29; middle school, p. 35; senior school, p. 52 | Grade-sensitive context and directory link; no invented grade-specific strand statements |
| Pertinent and contemporary issues, p. 110 | Local-life connections, health/safety, environmental care, digital responsibility and community use where appropriate |
| Assessment and evidence, pp. 113–115 | Observable activity outcome → task → evidence → explanation |
| Validity, reliability, fairness, flexibility and access, p. 116 | Success criteria and access/support notes; no unsupported mastery inference from a quiz score or completion flag |
| Assessment as/for learning, p. 118 | Learner self-review, specific evidence/help request and next improvement |
| Checklists/rating scales/rubrics, p. 119; portfolios, p. 121 | Evidence criteria and downloadable personal evidence journal |

The four-step product learning cycle (Understand → Apply → Show evidence → Reflect and improve) is an Assignment Hub adaptation. It is not quoted as an official KICD sequence. Specific activity outcomes and review prompts are product-authored unless supplied through a teacher’s learning brief or existing activity metadata. No KICD approval is claimed.

## What changed

- My Assignments: planning panels and evidence criteria; teacher-authored briefs take precedence over generic study goals. Personal reflection appears after released results, not during active assessment. Existing question types, scores, submissions, timers and release controls are retained.
- Teacher assignment editor: optional learning-brief builder appends outcome, evidence, criteria, real-life connection, support and feedback to the existing description field. It preserves prior instructions and blocks inserting a second brief. Editing remains available in the description. No database migration or new API contract is required. The student assessment shows the teacher’s description as plain text.
- STEM: six authored models have specific outcomes and evidence. Other labs use existing outcome metadata where available, otherwise a general inquiry intention. Their original notebooks and server completion are separate from the new self-review.
- Learn a Skill: course plans use the objectives in the authored lesson path rather than stale generic seeded outlines. Each of the 40 authored lessons gets its actual objective plus course-specific evidence, criteria, values, transfer and support. Self-review does not reset or block existing completion records.
- My Resources: default Learning guide, searchable outcome explorer across the learner’s accessible assignments/labs/courses, official directory links, seven competencies, source notes and saved personal evidence. Marketplace, purchases, library and study plan remain available. Marketplace resource cards explain the learning purpose of each resource type; payment/download behaviour is unchanged. Browsing the guide does not request progress on untouched free courses, purchase anything or enroll learners.

## Persistence and limits

Personal learning reviews are localStorage records scoped by user ID and activity ID under `assignmenthub-learning-review-v1`. Records include outcome statements, evidence/help notes, individual self-review choices and a next step. They survive refresh on the same browser and can be downloaded individually or as a journal. They are not synced to the server, submitted to teachers or converted to mastery scores. The UI explicitly says so and surfaces storage failures with a download option. Lab notebooks, code drafts and real submissions retain their existing storage paths.

Self-review choices are “I need help”, “I am practising”, and “Ready to discuss my evidence”. These are not official assessment levels. An incomplete or difficult attempt can legitimately be recorded as a help request. Each exported status is paired with the correct outcome, even when choices were made in a different order. Invalid stored links and malformed records are ignored; learner keys prevent cross-account journal display.

## Validation and deployment

`npm run test:curriculum` checks source taxonomy/page references, known grade directory paths, all 40 lesson objectives, six STEM evidence plans, teacher-brief round-trip and precedence, record validation, user scoping and exports. The GitHub deployment workflow runs it alongside the existing 27 activity tests before building and publishing. Browser checks cover student guide/filtering, no accidental enrollment/purchases, marketplace retention, teacher brief insertion, actual skill objectives, local save/reload/export, STEM usability, active-assessment separation and phone layouts. API responses in browser checks are fixtures; no real learner work or live assignments were edited.

The automatic AWS workflow publishes the frontend and verifies the public build after CloudFront invalidation. Source citations do not require publishing the user’s complete PDF; the PDF has not been copied to the public website.
