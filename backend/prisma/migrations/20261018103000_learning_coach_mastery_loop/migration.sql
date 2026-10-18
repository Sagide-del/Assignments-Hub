-- Add learner-facing mastery signals without changing formal assignments,
-- submissions, or teacher grading records.
ALTER TABLE "learning_coach_plans"
  ADD COLUMN "low_performance_streak" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "next_review_at" TIMESTAMP(3),
  ADD COLUMN "requires_human_support" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "learning_coach_plans_student_id_next_review_at_idx"
  ON "learning_coach_plans"("student_id", "next_review_at");
