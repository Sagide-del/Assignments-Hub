# Focused skill learning

Students see curated courses for their current curriculum and chosen focus. Music is inferred from a music track/elective; other supported focuses can be explicitly selected from curriculum-eligible options. Unknown focus does not fall back to the whole catalogue. Recommendations follow a stable course order and fill at most two active-learning slots.

`GET /skills/learning-path` is read-only. `POST /skills/enrollments` explicitly starts a free course or requests a paid one. Student-row locks serialize starts, resumes, focus changes, completions and privileged activations. REQUESTED, AWAITING_PAYMENT and ACTIVE all count against the limit. Pausing preserves progress and payment records. A confirmed course payment can resume without charging again.

The additive migration creates interest/evidence/pause metadata and publishes two platform-authored music courses. It pauses legacy excess enrollments while keeping the most recently practised active work first. It does not delete enrollments, evidence or payments, and it never reruns the taxonomy seed. The migration is transactional.

Canonical course design lives in `src/skills/content/focused-programs.json`. Existing lesson keys are retained. New music lessons cover pulse, groove, melody, harmony, arrangement, mixing, songwriting and vocals. Music courses target Grades 10–12, matching the current Music Studio. Younger learners are not sent to an unavailable senior lab.

Completion requires an actual registered lesson key, the correct knowledge-check answer, practice evidence and a reflection on a different situation. Preceding lessons must be complete. These are structural learning checks and self-reported practical evidence, not an automated judgement of musical quality or a teacher qualification. Completion frees the slot. Previous completions are preserved rather than relabelled as newly assessed work.

Workbooks use the original Assignment Hub logo, forest green/lime branding, original examples, project briefs, transfer tasks, writing spaces and a review rubric. A protected PDF route validates curriculum access, embeds the logo, disables JavaScript and blocks remote requests. No personal learner data or external media is embedded. Offline review prompts use one-, three- and seven-day revisits.

The public `/skills/capabilities` gate checks new columns and the two distinct published music course titles before frontend publication. Tests use only a disposable localhost `focused_skills_test` database and mocked external services; no real payment or SMS is sent.
