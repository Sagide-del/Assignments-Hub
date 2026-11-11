-- Additive CMS practice progress only. Existing school assignments and
-- submissions are deliberately not changed.
CREATE TYPE "StudentMasteryStatus" AS ENUM ('LOCKED', 'IN_PROGRESS', 'MASTERED', 'REMEDIAL');

CREATE TABLE "student_mastery_progress" (
    "id" TEXT NOT NULL,
    "student_id" INTEGER NOT NULL,
    "module_id" TEXT NOT NULL,
    "batch_number" INTEGER NOT NULL DEFAULT 1,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "best_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mastery_status" "StudentMasteryStatus" NOT NULL DEFAULT 'LOCKED',
    "last_attempt_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "student_mastery_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_mastery_progress_student_id_module_id_batch_number_key"
ON "student_mastery_progress"("student_id", "module_id", "batch_number");
CREATE INDEX "student_mastery_progress_student_id_mastery_status_idx"
ON "student_mastery_progress"("student_id", "mastery_status");

ALTER TABLE "student_mastery_progress"
ADD CONSTRAINT "student_mastery_progress_student_id_fkey"
FOREIGN KEY ("student_id") REFERENCES "question_generation_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_mastery_progress"
ADD CONSTRAINT "student_mastery_progress_module_id_fkey"
FOREIGN KEY ("module_id") REFERENCES "MasterModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
