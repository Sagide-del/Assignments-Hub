BEGIN;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "weak_subjects" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "strong_subjects" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "primary_skill_focus" TEXT;

ALTER TABLE "learning_coach_report_cards"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'UPLOADED',
  ADD COLUMN IF NOT EXISTS "extracted_scores" JSONB,
  ADD COLUMN IF NOT EXISTS "diagnosis" JSONB,
  ADD COLUMN IF NOT EXISTS "analyzed_at" TIMESTAMP(3);

DO $$ BEGIN
  CREATE TYPE "SubjectCategory" AS ENUM ('CORE', 'ELECTIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "MasterModule"
  ADD COLUMN IF NOT EXISTS "subject_category" "SubjectCategory" NOT NULL DEFAULT 'CORE';

CREATE INDEX IF NOT EXISTS "users_school_id_weak_subjects_idx" ON "users" USING GIN ("weak_subjects");
CREATE INDEX IF NOT EXISTS "learning_coach_report_cards_student_id_status_idx" ON "learning_coach_report_cards" ("student_id", "status");

COMMIT;
