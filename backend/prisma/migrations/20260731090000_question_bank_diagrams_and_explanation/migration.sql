-- Additive only — no existing table, column, or enum value is altered or
-- dropped. Adds diagram support + Bloom's-level tagging to the Question
-- Bank, and a per-question explanation column on the real Question table
-- so a bank question's explanation can survive publish/select and be
-- shown to students after their results are released (see
-- SubmissionsService.sanitizeStudentSubmission / AssignmentsService.
-- stripAnswersForStudent, both updated to keep this column private until
-- then, exactly like correctAnswer/config already are).

ALTER TABLE "question_bank" ADD COLUMN "diagram_url" TEXT;
ALTER TABLE "question_bank" ADD COLUMN "diagram_alt" TEXT;
ALTER TABLE "question_bank" ADD COLUMN "bloom_level" TEXT;

ALTER TABLE "questions" ADD COLUMN "explanation" TEXT;
