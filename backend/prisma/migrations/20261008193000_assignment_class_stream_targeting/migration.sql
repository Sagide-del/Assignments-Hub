-- Additive delivery targeting for school assignments. Existing rows remain
-- grade-wide because both new columns are nullable.
ALTER TABLE "assignments"
ADD COLUMN "target_class" TEXT,
ADD COLUMN "target_stream" TEXT;

CREATE INDEX "assignments_created_by_id_idx"
ON "assignments"("created_by_id");

CREATE INDEX "assignments_school_id_grade_target_stream_is_published_idx"
ON "assignments"("school_id", "grade", "target_stream", "is_published");
