-- Additive lesson engine storage. Existing assessment and submission tables
-- are intentionally not changed.
CREATE TABLE "lesson_content" (
  "id" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "grade_level" INTEGER NOT NULL,
  "script_json" JSONB NOT NULL,
  "visualization_type" TEXT NOT NULL DEFAULT 'NONE',
  "visualization_data" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "lesson_content_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lesson_content_subject_topic_grade_level_key"
  ON "lesson_content"("subject", "topic", "grade_level");
CREATE INDEX "lesson_content_grade_level_subject_idx"
  ON "lesson_content"("grade_level", "subject");

CREATE TABLE "student_lesson_progress" (
  "id" TEXT NOT NULL,
  "student_id" INTEGER NOT NULL,
  "lesson_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  "score" INTEGER,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "student_lesson_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_lesson_progress_student_id_lesson_id_key"
  ON "student_lesson_progress"("student_id", "lesson_id");
CREATE INDEX "student_lesson_progress_student_id_status_idx"
  ON "student_lesson_progress"("student_id", "status");
ALTER TABLE "student_lesson_progress"
  ADD CONSTRAINT "student_lesson_progress_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_lesson_progress"
  ADD CONSTRAINT "student_lesson_progress_lesson_id_fkey"
  FOREIGN KEY ("lesson_id") REFERENCES "lesson_content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
