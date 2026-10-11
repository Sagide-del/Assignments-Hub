CREATE TABLE "skill_lesson_progress" (
    "id" SERIAL NOT NULL,
    "enrollment_id" INTEGER NOT NULL,
    "lesson_key" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_lesson_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "skill_lesson_progress_enrollment_id_lesson_key_key"
ON "skill_lesson_progress"("enrollment_id", "lesson_key");

CREATE INDEX "skill_lesson_progress_enrollment_id_completed_at_idx"
ON "skill_lesson_progress"("enrollment_id", "completed_at");

ALTER TABLE "skill_lesson_progress"
ADD CONSTRAINT "skill_lesson_progress_enrollment_id_fkey"
FOREIGN KEY ("enrollment_id") REFERENCES "skill_enrollments"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
