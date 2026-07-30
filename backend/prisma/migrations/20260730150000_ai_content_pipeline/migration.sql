-- Additive AI content pipeline. This migration intentionally creates only
-- new enums, tables, indexes, and foreign keys. Existing learning tables are
-- not altered.

CREATE TYPE "AiFeature" AS ENUM (
  'ASSIGNMENT_DRAFT',
  'QUESTION_SET',
  'FEEDBACK_DRAFT',
  'GRADING_SUGGESTION',
  'LEARNING_RECOMMENDATION'
);

CREATE TYPE "AiJobStatus" AS ENUM (
  'QUEUED',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED'
);

CREATE TYPE "AiExtractionStatus" AS ENUM (
  'PROCESSING',
  'COMPLETED',
  'FAILED'
);

CREATE TYPE "AiArtifactType" AS ENUM (
  'ASSIGNMENT_DRAFT',
  'QUESTION_SET',
  'FEEDBACK_DRAFT',
  'GRADING_SUGGESTION',
  'LEARNING_RECOMMENDATION'
);

CREATE TYPE "AiArtifactStatus" AS ENUM (
  'GENERATED',
  'IN_REVIEW',
  'APPROVED',
  'REJECTED',
  'PUBLISHED',
  'ARCHIVED'
);

CREATE TYPE "AiReviewDecision" AS ENUM (
  'APPROVED',
  'REJECTED',
  'EDITED',
  'PUBLISHED'
);

CREATE TABLE "ai_feature_configs" (
  "id" SERIAL NOT NULL,
  "school_id" INTEGER NOT NULL,
  "feature" "AiFeature" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "preview_only" BOOLEAN NOT NULL DEFAULT true,
  "monthly_request_limit" INTEGER,
  "configuration" JSONB,
  "updated_by_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ai_feature_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_extracted_contents" (
  "id" SERIAL NOT NULL,
  "school_id" INTEGER NOT NULL,
  "uploaded_by_id" INTEGER NOT NULL,
  "file_name" TEXT NOT NULL,
  "file_url" TEXT,
  "storage_key" TEXT,
  "subject" TEXT NOT NULL,
  "grade" TEXT,
  "topic_count" INTEGER NOT NULL DEFAULT 0,
  "content" JSONB NOT NULL,
  "status" "AiExtractionStatus" NOT NULL DEFAULT 'PROCESSING',
  "error" TEXT,
  "idempotency_key" TEXT NOT NULL,
  "input_hash" TEXT NOT NULL,
  "started_at" TIMESTAMP(3),
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ai_extracted_contents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_generation_jobs" (
  "id" SERIAL NOT NULL,
  "school_id" INTEGER NOT NULL,
  "requested_by_id" INTEGER NOT NULL,
  "feature" "AiFeature" NOT NULL,
  "status" "AiJobStatus" NOT NULL DEFAULT 'QUEUED',
  "extracted_content_id" INTEGER,
  "source_assignment_id" INTEGER,
  "source_submission_id" INTEGER,
  "provider" "AiProvider",
  "model" TEXT,
  "prompt_template_version" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "input_hash" TEXT NOT NULL,
  "parameters" JSONB,
  "prompt_tokens" INTEGER,
  "completion_tokens" INTEGER,
  "total_tokens" INTEGER,
  "error_code" TEXT,
  "error_message" TEXT,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ai_generation_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_content_artifacts" (
  "id" SERIAL NOT NULL,
  "school_id" INTEGER NOT NULL,
  "generation_job_id" INTEGER NOT NULL,
  "extracted_content_id" INTEGER,
  "type" "AiArtifactType" NOT NULL,
  "status" "AiArtifactStatus" NOT NULL DEFAULT 'GENERATED',
  "version" INTEGER NOT NULL DEFAULT 1,
  "content" JSONB NOT NULL,
  "content_hash" TEXT NOT NULL,
  "published_assignment_id" INTEGER,
  "reviewed_by_id" INTEGER,
  "reviewed_at" TIMESTAMP(3),
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ai_content_artifacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_review_events" (
  "id" SERIAL NOT NULL,
  "school_id" INTEGER NOT NULL,
  "artifact_id" INTEGER NOT NULL,
  "reviewer_id" INTEGER NOT NULL,
  "decision" "AiReviewDecision" NOT NULL,
  "notes" TEXT,
  "content_hash" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_review_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_feature_configs_school_id_feature_key"
  ON "ai_feature_configs"("school_id", "feature");
CREATE INDEX "ai_feature_configs_school_id_enabled_idx"
  ON "ai_feature_configs"("school_id", "enabled");

CREATE UNIQUE INDEX "ai_extracted_contents_school_id_idempotency_key_key"
  ON "ai_extracted_contents"("school_id", "idempotency_key");
CREATE INDEX "ai_extracted_contents_school_id_status_created_at_idx"
  ON "ai_extracted_contents"("school_id", "status", "created_at");
CREATE INDEX "ai_extracted_contents_uploaded_by_id_created_at_idx"
  ON "ai_extracted_contents"("uploaded_by_id", "created_at");

CREATE UNIQUE INDEX "ai_generation_jobs_school_id_idempotency_key_key"
  ON "ai_generation_jobs"("school_id", "idempotency_key");
CREATE INDEX "ai_generation_jobs_school_feature_status_created_idx"
  ON "ai_generation_jobs"("school_id", "feature", "status", "created_at");
CREATE INDEX "ai_generation_jobs_requested_by_id_created_at_idx"
  ON "ai_generation_jobs"("requested_by_id", "created_at");
CREATE INDEX "ai_generation_jobs_extracted_content_id_idx"
  ON "ai_generation_jobs"("extracted_content_id");
CREATE INDEX "ai_generation_jobs_source_assignment_id_idx"
  ON "ai_generation_jobs"("source_assignment_id");
CREATE INDEX "ai_generation_jobs_source_submission_id_idx"
  ON "ai_generation_jobs"("source_submission_id");

CREATE INDEX "ai_content_artifacts_school_type_status_created_idx"
  ON "ai_content_artifacts"("school_id", "type", "status", "created_at");
CREATE INDEX "ai_content_artifacts_generation_job_id_idx"
  ON "ai_content_artifacts"("generation_job_id");
CREATE INDEX "ai_content_artifacts_extracted_content_id_idx"
  ON "ai_content_artifacts"("extracted_content_id");
CREATE INDEX "ai_content_artifacts_published_assignment_id_idx"
  ON "ai_content_artifacts"("published_assignment_id");

CREATE INDEX "ai_review_events_school_id_created_at_idx"
  ON "ai_review_events"("school_id", "created_at");
CREATE INDEX "ai_review_events_artifact_id_created_at_idx"
  ON "ai_review_events"("artifact_id", "created_at");
CREATE INDEX "ai_review_events_reviewer_id_created_at_idx"
  ON "ai_review_events"("reviewer_id", "created_at");

ALTER TABLE "ai_feature_configs"
  ADD CONSTRAINT "ai_feature_configs_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_feature_configs"
  ADD CONSTRAINT "ai_feature_configs_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_extracted_contents"
  ADD CONSTRAINT "ai_extracted_contents_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_extracted_contents"
  ADD CONSTRAINT "ai_extracted_contents_uploaded_by_id_fkey"
  FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ai_generation_jobs"
  ADD CONSTRAINT "ai_generation_jobs_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_generation_jobs"
  ADD CONSTRAINT "ai_generation_jobs_requested_by_id_fkey"
  FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_generation_jobs"
  ADD CONSTRAINT "ai_generation_jobs_extracted_content_id_fkey"
  FOREIGN KEY ("extracted_content_id") REFERENCES "ai_extracted_contents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_generation_jobs"
  ADD CONSTRAINT "ai_generation_jobs_source_assignment_id_fkey"
  FOREIGN KEY ("source_assignment_id") REFERENCES "assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_generation_jobs"
  ADD CONSTRAINT "ai_generation_jobs_source_submission_id_fkey"
  FOREIGN KEY ("source_submission_id") REFERENCES "submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_content_artifacts"
  ADD CONSTRAINT "ai_content_artifacts_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_content_artifacts"
  ADD CONSTRAINT "ai_content_artifacts_generation_job_id_fkey"
  FOREIGN KEY ("generation_job_id") REFERENCES "ai_generation_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_content_artifacts"
  ADD CONSTRAINT "ai_content_artifacts_extracted_content_id_fkey"
  FOREIGN KEY ("extracted_content_id") REFERENCES "ai_extracted_contents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_content_artifacts"
  ADD CONSTRAINT "ai_content_artifacts_published_assignment_id_fkey"
  FOREIGN KEY ("published_assignment_id") REFERENCES "assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_content_artifacts"
  ADD CONSTRAINT "ai_content_artifacts_reviewed_by_id_fkey"
  FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_review_events"
  ADD CONSTRAINT "ai_review_events_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_review_events"
  ADD CONSTRAINT "ai_review_events_artifact_id_fkey"
  FOREIGN KEY ("artifact_id") REFERENCES "ai_content_artifacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_review_events"
  ADD CONSTRAINT "ai_review_events_reviewer_id_fkey"
  FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
