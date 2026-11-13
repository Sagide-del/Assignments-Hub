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
