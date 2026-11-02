CREATE TABLE "early_years_activities" (
  "id" TEXT NOT NULL,
  "grade" TEXT NOT NULL,
  "area" TEXT NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'EN',
  "title" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "audience" TEXT NOT NULL DEFAULT 'BOTH',
  "school_ids" JSONB NOT NULL DEFAULT '[]',
  "created_by_id" INTEGER NOT NULL,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "early_years_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "early_years_activity_progress" (
  "id" TEXT NOT NULL,
  "activity_id" TEXT NOT NULL,
  "student_id" INTEGER NOT NULL,
  "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "early_years_activity_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "early_years_activity_progress_activity_id_student_id_key" ON "early_years_activity_progress"("activity_id", "student_id");
CREATE INDEX "early_years_activities_grade_status_audience_idx" ON "early_years_activities"("grade", "status", "audience");
CREATE INDEX "early_years_activities_area_language_idx" ON "early_years_activities"("area", "language");
CREATE INDEX "early_years_activity_progress_student_id_completed_at_idx" ON "early_years_activity_progress"("student_id", "completed_at");
