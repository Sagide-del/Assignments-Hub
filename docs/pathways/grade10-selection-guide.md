# Grade 10 selection guide

Grade 9 learners open **Grade 10 Selection Guide** in their existing My Pathway
navigation (`/student/my-pathway`, with `/student/career/navigator` as an alias).
Grades 10–12 keep the existing senior workspace under **Career Compass**.

The draft proposal called Grade 9 results KCBE and assumed a universal 40% pass
mark. This implementation uses optional school/KJSEA percentages or the learner's
latest confirmed Learning Coach report. It does not convert performance bands
into invented percentages, infer official eligibility or reject combinations
because a junior learner has never studied a senior elective.

Preparation indicators map senior science/technical subjects to explicitly
labelled junior foundations. Missing scores remain unknown. A learner's personal
practice goal is advisory, not an MoE cutoff. Careers come from published track
reference data, not generated employment promises. No AI request occurs on login
or matching, keeping operating costs and fabricated requirements down.

## Official data boundary

No 60-record or 418-record official catalogue was attached to the request. No
national codes are generated or seeded as official. The seed script defaults to
dry run and does not write without a supplied catalogue. Until a reviewed source
is imported, students see clearly labelled published pathway exploration and may
save a planning preference. The actual catalogue count is shown.

A platform admin opens **Content Library → Grade 10 subject combinations**. Upload
one JSON array (code, pathway, track, three subjects per record), supply the
Ministry/KEMIS/KICD source URL, validate, review the source, then publish. This is
a source-review workflow, not an automated assertion that any user-supplied URL
proves a record is official. Imports upsert by code and preserve existing shortlists;
use Unpublish for withdrawn codes to preserve earlier shortlists while removing them from new recommendations. Review changed data before subsequent import.

CLI equivalent:
`npx ts-node src/scripts/seed-moe-combinations.ts /path/catalog.json --source https://education.go.ke/path`
Add `--apply --reviewed` only after reviewing the dry-run mapping and source.
There is deliberately no invented bundled catalogue.

## Access and persistence

Student APIs use the signed-in actor, then check their current database grade
and school. No body-supplied student ID is accepted. Catalogue import is
PLATFORM_ADMIN-only. The new `MoE_Combination` and `Grade10CombinationChoice`
models have source provenance, unique codes, tenant-bound student foreign keys,
and an exclusive-choice constraint. Save changes only the planning shortlist;
it never changes User electives, school placement or current enrolled track.

Migration: `20261113110000_grade10_combination_guide`. No taxonomy reseed is needed.
Deployment waits for `/api/v1/career/capabilities` to confirm the new tables before
publishing. The readiness count may correctly be zero while official data is
awaiting review. Existing payment, SBA, CSL and teacher scope logic are unchanged.

## Saved Grade 9 results

`Student_KJSEA_Result` stores the signed-in learner's self-reported subject
percentages or original EE/ME/AE/BE (including 1/2 sublevels). A subject may have
one representation, never both. Bands remain bands; no percentage or admission
chance is inferred. Missing data is not a missing senior-subject prerequisite.

The learner may save/edit results in the guide. Saved results take precedence
over confirmed Learning Coach percentages for the same subject; a preview
percentage request is temporary. Endpoints `GET/PUT /career/kjsea-results` are
Grade-9, STUDENT and actor/school scoped. The new model uses the actual integer
User ID and a composite school/student foreign key.

Source supplied on 13 November 2026: https://selection.education.go.ke/pathways.
The source has not been downloaded or its catalogue count verified: this
workspace's enforced network allowlist rejected the connection. A reviewed draft
adds the selection portal and the existing KEMIS mirror without removing current
access. Apply/publish that environment configuration before retrieving official
data. No 418/571 count or prerequisites are treated as verified in the meantime.

## Owner-confirmed portal copy — 13 November 2026

The owner supplied 60 records and explicitly confirmed they were copied from
https://selection.education.go.ke/pathways. The supplied JSON is versioned at
`backend/src/career/data/owner-supplied-combinations-20261113.json`, with an
accompanying provenance/checksum manifest. This is owner-confirmed source review,
not a claim that the assistant independently downloaded the portal. The copy
contains 20 Applied Sciences, 20 Languages & Literature, and 20 Arts entries; it
is not represented as the complete national catalogue. Original subject names
are preserved.

Migration `20261113160000_supplied_combination_reference` imports these records
idempotently by code, activates unreviewed matching entries, and leaves existing
reviewed records untouched. It preserves record IDs and existing shortlists.
Readiness version 3 checks that all 60 supplied codes exist before deployment.
Students can search by code/subject or expand the full results list. Careers are
exploratory references from published tracks; no official eligibility threshold
is invented. The earlier note about awaiting a JSON file is historical: this
owner-confirmed copy now provides a usable partial catalogue.
