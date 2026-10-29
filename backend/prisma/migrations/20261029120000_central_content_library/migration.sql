ALTER TABLE "mnemonic_cards" ADD COLUMN "content" JSONB, ADD COLUMN "source_document_id" INTEGER;
CREATE TABLE "content_library_jobs" ("id" TEXT PRIMARY KEY,"kind" TEXT NOT NULL,"status" TEXT NOT NULL DEFAULT 'QUEUED',"input" JSONB NOT NULL,"result" JSONB,"error" TEXT,"created_by_id" INTEGER NOT NULL,"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "content_library_jobs_status_created_at_idx" ON "content_library_jobs"("status","created_at");
CREATE UNIQUE INDEX "independent_practice_open_batch" ON "kjsea_mock_attempts" ("student_id", lower("subject"), ("coverage"->>'grade')) WHERE "source" = 'PRACTICE' AND "status" = 'DRAFT';
