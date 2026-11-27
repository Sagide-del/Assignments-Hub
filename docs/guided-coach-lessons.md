# Guided lessons inside Learning Coach

The learner’s workflow is **Learning Coach → priority topic → explanation → formative check → reviewed practice → recovery plan**. No additional sidebar destination is needed. Bookmarked `/student/learn/...` URLs redirect into the Coach; the learner can always return without entering an assignment listing.

## Personalization and content

- Topics use the authoritative current student profile, grade and explicit subject enrolment, including cross-track electives. Direct requests for another subject, an unknown topic or a lesson from another grade are rejected.
- Priorities use the existing recovery signals (confirmed report results, published school marks, practice and reviews), with canonical weak-subject names. Taxonomy, recovery topics and a small set of grade-specific worked examples are deduplicated.
- When AI is unavailable, explicit offline examples cover counting/addition, equivalent fractions, linear equations, surds, atomic structure, forces, inheritance and electric circuits at their configured grade ranges. An unsupported topic returns a retryable availability error rather than storing generic pretend teaching.
- AI scripts require a greeting, explanation/illustration and valid multiple-choice check. Null steps, empty/oversized text, duplicate/non-text options and answers missing from the choices are rejected. Old generic cached scripts are repaired when opened.

## Checks and completion

- An incorrect answer shows a retry action instead of locking the learner out. The first response is retained separately from retries.
- The server calculates a formative first-answer score. Legacy percentage-only requests cannot set a trusted score. Completion requires a previously opened, currently permitted lesson; duplicate completion requests preserve the original completion and score.
- Completion remains inside the Coach. Matching reviewed practice opens the existing private Coach session in the same route. If practice/save fails, answers and saved completion remain available for retry.
- Completed guided lessons are included in the private engagement report as learning activity. These check scores do not become formal marks or change mastery/recovery priorities; reviewed assessments provide that evidence.
- Browser speech is optional. Text remains usable when speech is unsupported, and narration stops on step changes, exit and completion.

## Verification

Unit tests cover scope, current-grade authority, priorities, invalid AI scripts, usable offline examples, old-cache repair, server scoring and idempotency. Browser checks cover wrong-answer recovery, save/practice failures, same-route completion, legacy URLs, learners without uploaded reports and 1440/390/320px layouts. Production publishing also verifies the guided lesson tables and versioned backend capability before shipping the UI.

A separate regression fix normalizes school-generated report remarks consistently when checking draft freshness, restoring publication without weakening enrolment/mark/policy comparisons.
