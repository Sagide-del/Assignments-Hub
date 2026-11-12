-- Repair the earlier migration's student FK. Prisma and the application both
-- use User.id; the old SQL incorrectly referenced question_generation_batches.
-- Keep the applied migration immutable and preserve every existing progress row.
BEGIN;
LOCK TABLE "student_mastery_progress" IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "student_mastery_progress" progress
    LEFT JOIN "users" learner ON learner."id" = progress."student_id"
    WHERE learner."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot repair mastery student relation: existing progress contains unknown user IDs. Preserve these records and reconcile their owners before retrying; no data has been changed.';
  END IF;
END $$;

ALTER TABLE "student_mastery_progress"
  DROP CONSTRAINT "student_mastery_progress_student_id_fkey";
ALTER TABLE "student_mastery_progress"
  ADD CONSTRAINT "student_mastery_progress_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;
